from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from loguru import logger
import polars as pl

from api.routers.data import get_qs_client

router = APIRouter()

@router.get("/global")
def global_search(
    query: str, 
    limit: int = 20, 
    asset_type: Optional[str] = None
):
    """
    Fast global search across 300k+ assets.
    """
    try:
        client = get_qs_client()
        
        # Sanitization
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
            
        # Prioritize exact matches and US listings for relevance
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

@router.get("/sectors")
def get_sector_performance(limit: int = 200, group_by: str = "industry"):
    """
    Get aggregated sector/industry performance.
    
    group_by: 
    - 'sector': Returns the 11 GICS sectors (e.g. Technology, Healthcare)
    - 'industry': Returns the 160+ specific industries (e.g. Software - Infrastructure)
    """
    try:
        client = get_qs_client()
        fmp = client._fmp_client
        
        # 1. Get Live Sector Performance from FMP
        try:
            sectors_df = fmp.get_sector_performance()
        except Exception as e:
            logger.warning(f"FMP Sector Performance failed: {e}")
            sectors_df = pl.DataFrame()

        # 2. Get Local Counts from Master Index
        # We perform the grouping in SQL
        
        if group_by == "sector":
            # Extract the part before " - "
            # DuckDB split_part syntax: split_part(string, delimiter, index)
            sql = """
                SELECT 
                    split_part(category, ' - ', 1) as name,
                    COUNT(*) as count,
                    SUM(CASE WHEN country = 'United States' THEN 1 ELSE 0 END) as us_count
                FROM master_assets_index 
                WHERE type = 'Equity' 
                AND category IS NOT NULL AND category != ''
                GROUP BY 1
                ORDER BY count DESC
            """
        else:
            # Full Category Name (Industry)
            sql = """
                SELECT 
                    category as name,
                    COUNT(*) as count,
                    SUM(CASE WHEN country = 'United States' THEN 1 ELSE 0 END) as us_count
                FROM master_assets_index 
                WHERE type = 'Equity' 
                AND category IS NOT NULL AND category != ''
                GROUP BY 1
                ORDER BY count DESC
            """
            
        local_counts = client.query(sql).to_dicts()
        
        results = []
        for row in local_counts:
            name = row['name']
            # Skip invalid
            if not name or name == 'N/A' or name == 'nan': continue
            
            perf_1d = 0.0
            
            # Match performance
            if not sectors_df.is_empty():
                for s_row in sectors_df.to_dicts():
                    # FMP Sector Names: "Technology", "Healthcare"
                    # Our Names: "Technology", "Health Care"
                    fmp_sec = s_row.get('sector', '')
                    
                    # Exact or fuzzy match
                    if fmp_sec in name or name in fmp_sec:
                        try:
                            perf_1d = float(s_row.get('changesPercentage', '0').strip('%'))
                        except: pass
                        break
            
            results.append({
                "name": name,
                "count": row['count'],
                "market_cap": 0, # Placeholder
                "avg_dividend_yield": 0, # Placeholder
                "pe_ratio": 0, # Placeholder
                "profit_margin": 0, # Placeholder
                "perf_1d": perf_1d,
                "perf_1w": 0,
                "perf_1m": 0,
                "perf_1y": 0
            })
            
        return results[:limit]

    except Exception as e:
        logger.error(f"Sector aggregation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
def get_asset_list(
    asset_type: str,
    category: Optional[str] = None,
    country: Optional[str] = None,
    exchange: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    Get a paginated list of assets based on filters (for Sidebar navigation).
    Enriched with Real-Time Prices via FMP.
    """
    try:
        client = get_qs_client()
        sql = f"SELECT * FROM master_assets_index WHERE type = '{asset_type}'"
        
        if category:
            # Allow partial match for "Sector" view (e.g. category='Technology' matches 'Technology - Software')
            # But we also want exact match capability.
            # Using ILIKE 'Category%' covers both: "Technology" matches "Technology" and "Technology - ..."
            sql += f" AND category ILIKE '{category}%'"
        if country:
            sql += f" AND country = '{country}'"
        if exchange:
            sql += f" AND exchange = '{exchange}'"
            
        sql += f" ORDER BY symbol LIMIT {limit} OFFSET {offset}"
        
        res = client.query(sql)
        data = res.to_dicts()
        
        # Data Enrichment: Fetch Real-Time Prices
        if data:
            symbols = [row['symbol'] for row in data if row['symbol']]
            if symbols:
                try:
                    # Batch fetch quotes (FMP supports comma-separated list)
                    # We chunk it to avoid URL length issues just in case, though 100 is usually fine
                    quotes_df = client._fmp_client.get_quote(symbols)
                    
                    if not quotes_df.empty:
                        # Create a map for fast lookup
                        # Assuming quotes_df has 'symbol', 'price', 'changesPercentage', 'change'
                        # FMP returns 'symbol', 'price', 'change', 'changesPercentage'
                        
                        price_map = {}
                        for quote in quotes_df.to_dict(orient='records'):
                            price_map[quote.get('symbol')] = {
                                'price': quote.get('price'),
                                'change': quote.get('change'),
                                'change_percent': quote.get('changesPercentage'),
                                'volume': quote.get('volume'),
                                'market_cap': quote.get('marketCap')
                            }
                            
                        # Merge back
                        for row in data:
                            quote = price_map.get(row['symbol'])
                            if quote:
                                # Prioritize FMP numeric data over DB string data
                                row['price'] = quote.get('price')
                                row['change'] = quote.get('change')
                                row['change_percent'] = quote.get('change_percent')
                                row['volume'] = quote.get('volume')
                                
                                # Only overwrite if FMP has a valid number
                                if quote.get('market_cap'):
                                    row['market_cap'] = quote.get('market_cap')
                                    
                except Exception as enrich_err:
                    logger.warning(f"Failed to enrich asset list with prices: {enrich_err}")
        
        return data
        
    except Exception as e:
        logger.error(f"Asset list failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
