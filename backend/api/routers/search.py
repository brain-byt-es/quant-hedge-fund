from typing import List, Optional
from urllib.parse import unquote

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.routers.data import get_qs_client

router = APIRouter()

@router.get("/debug_routes")
def debug_search_routes():
    return {"status": "ok", "router": "search", "routes": ["global", "sectors", "industry/{cat}", "options", "list"]}

@router.get("/sectors")
def get_sector_performance(limit: int = 200, group_by: str = "industry"):
    """
    Get aggregated sector/industry performance from the pre-calculated stats table.
    """
    try:
        client = get_qs_client()

        # Try to fetch from the pre-calculated table
        sql_stats = f"""
            SELECT 
                name,
                group_type,
                stock_count as count,
                market_cap,
                total_revenue,
                avg_pe as pe_ratio,
                avg_dividend_yield,
                avg_profit_margin as profit_margin,
                perf_1d,
                perf_1w,
                perf_1m,
                perf_1y
            FROM sector_industry_stats
            WHERE group_type = '{group_by}'
            ORDER BY count DESC
            LIMIT {limit}
        """

        res = client.query(sql_stats)

        if not res.is_empty():
            return res.to_dicts()

        # FALLBACK: If stats table is empty, run live count
        if group_by == "sector":
            sql_live = """
                SELECT 
                    split_part(category, ' - ', 1) as name,
                    COUNT(*) as count
                FROM master_assets_index 
                WHERE type = 'Equity' AND category IS NOT NULL AND category != ''
                GROUP BY 1
                ORDER BY count DESC
            """
        else:
            sql_live = """
                SELECT 
                    category as name,
                    COUNT(*) as count
                FROM master_assets_index 
                WHERE type = 'Equity' AND category IS NOT NULL AND category != ''
                GROUP BY 1
                ORDER BY count DESC
            """

        local_counts = client.query(sql_live).to_dicts()

        results = []
        for row in local_counts:
            results.append({
                "name": row['name'],
                "count": row['count'],
                "market_cap": 0,
                "total_revenue": 0,
                "pe_ratio": 0,
                "avg_dividend_yield": 0,
                "profit_margin": 0,
                "perf_1d": 0.0
            })

        return results[:limit]

    except Exception as e:
        logger.error(f"Sector aggregation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/industry/{category}")
def get_industry_details(category: str, countries: Optional[List[str]] = Query(None)):
    """
    Get stats for a specific industry or sector, optionally filtered by countries.
    Uses real-time price and shares data for maximum accuracy.
    """
    try:
        client = get_qs_client()
        category = unquote(category)

        # Base condition - Search in both master index and stock list
        # We check both category (master) and sector/industry (stock_list)
        where_m = f"(m.category ILIKE '{category}%' OR m.category ILIKE '% - {category}%')"
        where_s = f"(s.industry ILIKE '{category}%' OR s.sector ILIKE '{category}%')"
        
        if countries:
            country_list = "', '".join([c.replace("'", "''") for c in countries])
            where_m += f" AND m.country IN ('{country_list}')"
            where_s += f" AND s.country IN ('{country_list}')"

        # Live calculation:
        # 1. We get the latest price (ignoring strict date to handle stale caches)
        # 2. We get the latest Shares (Basic) from income statements
        # 3. We fallback to stock_list_fmp for price if historical is missing
        sql = f"""
            WITH universe AS (
                SELECT symbol FROM master_assets_index m WHERE {where_m}
                UNION
                SELECT symbol FROM stock_list_fmp s WHERE {where_s}
            ),
            latest_prices AS (
                SELECT symbol, close
                FROM historical_prices_fmp
                WHERE symbol IN (SELECT symbol FROM universe)
                QUALIFY row_number() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
            ),
            latest_rev AS (
                SELECT symbol, revenue, "Shares (Basic)" as shares
                FROM bulk_income_quarter_fmp
                WHERE symbol IN (SELECT symbol FROM universe)
                QUALIFY row_number() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
            )
            SELECT 
                COUNT(u.symbol) as count,
                SUM(COALESCE(p.close * r.shares, s.price * r.shares, 0.0)) as market_cap,
                SUM(COALESCE(r.revenue, 0.0)) as total_revenue
            FROM universe u
            LEFT JOIN latest_prices p ON u.symbol = p.symbol
            LEFT JOIN stock_list_fmp s ON u.symbol = s.symbol
            LEFT JOIN latest_rev r ON u.symbol = r.symbol
        """

        res = client.query(sql).to_dicts()
        if not res:
            return {"name": category, "count": 0, "market_cap": 0, "total_revenue": 0}

        stats = res[0]
        return {
            "name": category,
            "count": stats['count'],
            "market_cap": stats['market_cap'] or 0.0,
            "total_revenue": stats['total_revenue'] or 0.0
        }
    except Exception as e:
        logger.error(f"Industry details failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/global")
def global_search(
    query: str,
    limit: int = 20,
    asset_type: Optional[str] = None,
    countries: Optional[List[str]] = Query(None)
):
    """
    Fast global search across 300k+ assets.
    """
    try:
        client = get_qs_client()
        query = query.replace("'", "''").strip()
        if not query:
            return []

        sql = f"""
            SELECT symbol, name, type, category, exchange, country 
            FROM master_assets_index 
            WHERE (
                symbol ILIKE '%{query}%' OR 
                name ILIKE '%{query}%'
            )
        """

        if asset_type:
            sql += f" AND type = '{asset_type}'"

        if countries:
            country_list = "', '".join([c.replace("'", "''") for c in countries])
            sql += f" AND country IN ('{country_list}')"

        sql += f"""
            ORDER BY 
                CASE WHEN symbol = '{query.upper()}' THEN 0 ELSE 1 END,
                CASE WHEN country = 'United States' THEN 0 ELSE 1 END,
                length(symbol) ASC
            LIMIT {limit}
        """

        res = client.query(sql)
        return res.to_dicts()

    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/options")
def get_filter_options(column: str, asset_type: Optional[str] = None):
    """
    Get distinct values for sidebar filters (e.g. all Sectors, all Countries).
    """
    valid_cols = ["type", "category", "exchange", "country", "currency"]
    if column not in valid_cols:
        raise HTTPException(status_code=400, detail="Invalid column")

    try:
        client = get_qs_client()
        sql = f"SELECT DISTINCT {column} FROM master_assets_index"

        if asset_type:
            sql += f" WHERE type = '{asset_type}'"

        sql += f" ORDER BY {column} ASC"

        res = client.query(sql)
        return [r[column] for r in res.to_dicts() if r[column]]

    except Exception as e:
        logger.error(f"Filter options failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
def get_asset_list(
    asset_type: str,
    category: Optional[str] = None,
    country: Optional[str] = None,
    exchange: Optional[str] = None,
    countries: Optional[List[str]] = Query(None),
    limit: int = 1000,
    offset: int = 0
):
    """
    Get a paginated list of assets based on filters.
    Enriched with Real-Time Prices via FMP.
    """
    try:
        client = get_qs_client()

        # Build conditions for both tables
        where_m = f"WHERE type = '{asset_type}'"
        where_s = "WHERE 1=1" # stock_list_fmp is mostly Equities, but we filter by industry
        
        if category:
            cat_clean = unquote(category).replace("'", "''")
            where_m += f" AND (category ILIKE '{cat_clean}%' OR category ILIKE '% - {cat_clean}%')"
            where_s += f" AND (industry ILIKE '{cat_clean}%' OR sector ILIKE '{cat_clean}%')"

        if country:
            where_m += f" AND country = '{country}'"
            where_s += f" AND country = '{country}'"
        elif countries:
            country_list = "', '".join([c.replace("'", "''") for c in countries])
            where_m += f" AND country IN ('{country_list}')"
            where_s += f" AND country IN ('{country_list}')"

        if exchange:
            where_m += f" AND exchange = '{exchange}'"
            # exchange in stock_list might be full name or short name
            where_s += f" AND (exchange = '{exchange}' OR exchange_short_name = '{exchange}')"

        # Combine results using UNION to ensure uniqueness and coverage
        # We join with factor_ranks_snapshot to get our pre-calculated metrics (price, change, mcap)
        sql = f"""
            WITH universe AS (
                SELECT symbol, name, type, category, exchange, country FROM master_assets_index {where_m}
                UNION
                SELECT symbol, name, 'Equity' as type, industry as category, exchange, country FROM stock_list_fmp s {where_s}
            )
            SELECT 
                u.*,
                COALESCE(r.price, 0.0) as price,
                COALESCE(r.change_1d, 0.0) as change_percent,
                COALESCE(r.market_cap, 0.0) as market_cap,
                COALESCE(r.volume, 0.0) as volume
            FROM universe u
            LEFT JOIN factor_ranks_snapshot r ON u.symbol = r.symbol
            ORDER BY u.symbol 
            LIMIT {limit} OFFSET {offset}
        """

        res = client.query(sql)
        data = res.to_dicts()

        # Data Enrichment (Real-time Polish)
        if data:
            symbols = [row['symbol'] for row in data if row['symbol']]
            if symbols:
                try:
                    # Enforce chunking for large symbol lists
                    batch_size = 50
                    for i in range(0, len(symbols), batch_size):
                        chunk = symbols[i:i + batch_size]
                        quotes_df = client._fmp_client.get_quotes_batch(chunk)
                        
                        if not quotes_df.empty:
                            price_map = {q.get('symbol'): q for q in quotes_df.to_dict(orient='records')}
                            
                            for row in data:
                                symbol = row['symbol']
                                if symbol in price_map:
                                    quote = price_map[symbol]
                                    # Update row with real-time data if available
                                    if quote.get('price'): row['price'] = quote.get('price')
                                    # FMP uses 'changesPercentage', we map to 'change_percent' for frontend
                                    if quote.get('changesPercentage') is not None:
                                        row['change_percent'] = quote.get('changesPercentage')
                                    if quote.get('marketCap'): row['market_cap'] = quote.get('marketCap')
                                    if quote.get('volume'): row['volume'] = quote.get('volume')
                except Exception as enrich_err:
                    logger.warning(f"Failed to enrich asset list: {enrich_err}")

        return data

    except Exception as e:
        logger.error(f"Asset list failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug_asset/{symbol}")
def debug_asset(symbol: str):
    try:
        client = get_qs_client()
        res = client.query(f"SELECT * FROM master_assets_index WHERE symbol = '{symbol}'")
        return res.to_dicts()
    except Exception as e:
        return {"error": str(e)}

@router.post("/repair")
def repair_search_index():
    """
    Comprehensive repair of country mappings and placeholder names.
    """
    try:
        client = get_qs_client()
        con = client._db_manager.connect()
        suffix_map = {
            '.SZ': 'China', '.SS': 'China', '.HK': 'Hong Kong',
            '.KS': 'South Korea', '.KQ': 'South Korea',
            '.DE': 'Germany', '.F': 'Germany', '.SG': 'Germany', '.BE': 'Germany', '.MU': 'Germany',
            '.L': 'United Kingdom', '.PA': 'France', '.NX': 'France',
            '.TO': 'Canada', '.V': 'Canada', '.AX': 'Australia',
            '.KL': 'Malaysia', '.NS': 'India', '.BO': 'India',
            '.MI': 'Italy', '.MC': 'Spain', '.SA': 'Brazil',
            '.JO': 'South Africa', '.T': 'Japan', '.SW': 'Switzerland',
            '.AT': 'Austria', '.LS': 'Portugal', '.AS': 'Netherlands',
            '.BR': 'Belgium', '.HE': 'Finland', '.OL': 'Norway', '.ST': 'Sweden'
        }
        for suffix, country in suffix_map.items():
            con.execute(f"UPDATE master_assets_index SET country = '{country}' WHERE symbol ILIKE '%{suffix}'")

        exchange_map = {
            'Shenzhen': 'China', 'Shanghai': 'China', 'Hong Kong': 'Hong Kong',
            'Tokyo': 'Japan', 'London': 'United Kingdom', 'Frankfurt': 'Germany',
            'Paris': 'France', 'Toronto': 'Canada', 'ASX': 'Australia'
        }
        for ex, country in exchange_map.items():
            con.execute(f"UPDATE master_assets_index SET country = '{country}' WHERE exchange ILIKE '%{ex}%'")

        con.execute("UPDATE master_assets_index SET country = 'Other' WHERE country = 'United States' AND symbol LIKE '%.%'")
        for suffix, country in suffix_map.items():
            con.execute(f"UPDATE master_assets_index SET country = '{country}' WHERE symbol ILIKE '%{suffix}'")

        con.execute("""
            UPDATE master_assets_index 
            SET country = 'United States' 
            WHERE (exchange ILIKE '%NASDAQ%' OR exchange ILIKE '%NYSE%' OR exchange = 'ASE' OR exchange = 'BATS')
            AND symbol NOT LIKE '%.%'
        """)
        con.execute("UPDATE master_assets_index SET name = symbol WHERE name IN ('one', 'two', 'Unknown', 'N/A', '') OR name IS NULL")
        con.execute("UPDATE master_assets_index SET country = 'United States' WHERE country ILIKE 'USA' OR country ILIKE 'U.S.'")

        return {"status": "success", "message": "Search index fully repaired."}
    except Exception as e:
        logger.error(f"Repair failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try: con.close()
        except: pass
