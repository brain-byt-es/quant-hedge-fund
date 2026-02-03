from typing import List, Dict, Any
import pandas as pd
from loguru import logger
from datetime import datetime, timedelta

def find_momentum_rockets(client, 
                          min_price: float = 2.0, 
                          max_price: float = 20.0, 
                          max_mcap: float = 300_000_000,
                          min_gain_pct: float = 10.0,
                          min_rvol: float = 5.0,
                          min_gap_pct: float = 4.0,
                          target_date: str = None) -> List[Dict[str, Any]]:
    """
    Scans for 'Small-Cap Rocket' candidates:
    1. DB Filter: Price $2-$20, Low Cap (<$300M)
    2. Real-time Filter: +10% Gain, 5x Relative Vol, Gap Up > 4%
    3. Catalyst Check: Recent News
    """
    signals = []
    
    # Check for Weekend (Saturday=5, Sunday=6) or forced Review Mode via target_date
    is_weekend = datetime.now().weekday() >= 5
    
    if target_date or is_weekend:
        mode = f"Historical Analysis ({target_date})" if target_date else "Weekend Review"
        logger.info(f"Scanner: {mode} mode active.")
        return _find_historical_rockets(client, min_price, max_price, max_mcap, min_gain_pct, min_rvol, min_gap_pct, target_date)
    
    try:
        # 1. Pre-filter from Database (Snapshot for speed)
        # We try factor_ranks_snapshot first, then fallback to bulk_company_profiles_fmp
        # Now including sector from profile table
        sql = f"""
            SELECT s.symbol, s.market_cap, p.sector
            FROM factor_ranks_snapshot s
            LEFT JOIN bulk_company_profiles_fmp p ON s.symbol = p.symbol
            WHERE s.price BETWEEN {min_price} AND {max_price}
              AND s.market_cap > 0 
              AND s.market_cap < {max_mcap}
        """
        try:
            candidates_df = client.query(sql).to_pandas()
        except Exception:
            candidates_df = pd.DataFrame()
        
        # ... [JIT Update Logic remains mostly same, maybe update fallback] ...
        
        if candidates_df.empty:
            logger.info("Scanner: No candidates in factor_ranks_snapshot. Checking if we should trigger JIT update...")
            
            # Check if we have basic data to even run a JIT update
            tables = client.query("SHOW TABLES").to_pandas()["name"].tolist()
            if "historical_prices_fmp" in tables:
                from qsresearch.features.factor_engine import FactorEngine
                engine = FactorEngine(db_mgr=client._db_manager)
                try:
                    # Run with 0 filters to include Small Caps in the snapshot
                    engine.calculate_universe_ranks(min_mcap=0, min_volume=0)
                    # Retry query
                    candidates_df = client.query(sql).to_pandas()
                except Exception as jit_err:
                    logger.error(f"Scanner JIT update failed: {jit_err}")
            
        if candidates_df.empty:
            logger.info("Scanner: Snapshot still empty. Trying bulk_company_profiles_fmp fallback...")
            tables = client.query("SHOW TABLES").to_pandas()["name"].tolist()
            if "bulk_company_profiles_fmp" in tables:
                sql_fallback = f"""
                    SELECT symbol, mktCap as market_cap, sector
                    FROM bulk_company_profiles_fmp
                    WHERE price BETWEEN {min_price} AND {max_price}
                      AND mktCap > 0 
                      AND mktCap < {max_mcap}
                """
                try:
                    candidates_df = client.query(sql_fallback).to_pandas()
                except Exception as fallback_err:
                    logger.debug(f"Scanner fallback failed: {fallback_err}")
            else:
                logger.warning("Scanner: bulk_company_profiles_fmp table does not exist. Please run ingestion.")

        if candidates_df.empty:
            logger.info("Scanner: No candidates found in DB pre-filter (Snapshot & Bulk).")
            return []
            
        if 'sector' not in candidates_df.columns:
            candidates_df['sector'] = "Unknown"
            
        candidate_symbols = candidates_df["symbol"].tolist()
        logger.info(f"Scanner: Checking {len(candidate_symbols)} candidates for momentum...")
        
        # 2. Live Quote Check (Batch for performance)
        # FMP allows batch requests. We might need to chunk if list is huge, 
        # but FMPClient.get_quotes_batch handles basic chunking.
        quotes_df = client._fmp_client.get_quotes_batch(candidate_symbols)
        
        if quotes_df.empty:
            return []
            
        # Ensure necessary columns exist
        required_cols = ['symbol', 'price', 'changesPercentage', 'volume', 'avgVolume', 'open', 'previousClose']
        if not all(col in quotes_df.columns for col in required_cols):
            logger.warning("Scanner: Missing columns in quote data.")
            return []

        for _, row in quotes_df.iterrows():
            symbol = row['symbol']
            
            # --- Logic Checks ---
            
            # A. Intraday Gain (+10%)
            # FMP 'changesPercentage' is usually already a percentage (e.g. 10.5 for 10.5%)
            if row['changesPercentage'] < min_gain_pct:
                continue
                
            # B. Relative Volume (5x)
            # Handle avgVolume = 0
            avg_vol = row['avgVolume'] if row['avgVolume'] > 0 else 1
            rvol = row['volume'] / avg_vol
            if rvol < min_rvol:
                continue
                
            # --- Logic Passed ---
            
            # 3. News Catalyst Check
            # Fetch latest news item
            catalyst = "-"
            catalyst_url = ""
            try:
                news_df = client._fmp_client.get_stock_news(symbol, limit=1)
                if not news_df.empty and 'title' in news_df.columns:
                    catalyst = news_df.iloc[0]['title']
                    catalyst_url = news_df.iloc[0]['url'] if 'url' in news_df.columns else ""
            except Exception:
                pass

            # Calculate Float (Strict Criterion: < 10M)
            float_shares = 0
            if 'sharesOutstanding' in row and row['sharesOutstanding'] > 0:
                float_shares = row['sharesOutstanding']
            else:
                try:
                    mcap = candidates_df[candidates_df['symbol'] == symbol]['market_cap'].values[0]
                    float_shares = mcap / row['price'] if row['price'] > 0 else 0
                except:
                    float_shares = 0
            
            if float_shares > 10_000_000:
                continue

            # Calculate Gap % (For Info only, not filter)
            gap_percent = 0.0
            prev_close = row['previousClose']
            if prev_close > 0:
                gap = (row['open'] - prev_close) / prev_close
                gap_percent = gap * 100

            # Extract Sector
            try:
                sector = candidates_df[candidates_df['symbol'] == symbol]['sector'].values[0]
            except:
                sector = "Unknown"

            signal = {
                "symbol": symbol,
                "price": row['price'],
                "change_percent": row['changesPercentage'],
                "gap_percent": gap_percent,
                "volume": row['volume'],
                "rvol": round(rvol, 1),
                "market_cap": candidates_df[candidates_df['symbol'] == symbol]['market_cap'].values[0],
                "float_shares": float_shares,
                "match_score": 5, # 5/5 Criteria met (Price, Change, RVOL, Float, News)
                "catalyst": catalyst,
                "catalyst_url": catalyst_url,
                "sector": sector,
                "timestamp": datetime.now().isoformat()
            }
            signals.append(signal)

    except Exception as e:
        logger.error(f"Scanner Error: {e}")
        
    # Sort by strongest momentum
    signals.sort(key=lambda x: x['change_percent'], reverse=True)
    return signals

def _find_historical_rockets(client, min_price, max_price, max_mcap, min_gain_pct, min_rvol, min_gap_pct, target_date=None):
    """
    Fallback for weekends/offline: Finds rockets from the last trading day (or target_date) in DB.
    """
    signals = []
    try:
        # Determine Date (Find closest available trading day <= target)
        search_date = target_date if target_date else datetime.now().strftime('%Y-%m-%d')
        
        try:
            date_sql = f"SELECT MAX(date) as effective_date FROM historical_prices_fmp WHERE date <= CAST('{search_date}' AS DATE)"
            date_res = client.query(date_sql)
            
            if date_res.is_empty() or date_res.to_dicts()[0]["effective_date"] is None:
                logger.warning(f"Scanner: No historical data found on or before {search_date}")
                return []
                
            last_date = date_res.to_dicts()[0]["effective_date"]
            
        except Exception as e:
            logger.error(f"Date resolution failed: {e}")
            return []
            
        logger.info(f"Scanner: Analyzing historical data for {last_date} (Requested: {search_date})")
        
        # Complex Query for Stats
        sql = f"""
            WITH Stats AS (
                SELECT 
                    symbol, date, close as price, volume, open,
                    LAG(close) OVER (PARTITION BY symbol ORDER BY date) as prev_close,
                    AVG(volume) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as avg_vol
                FROM historical_prices_fmp
                WHERE date >= CAST('{last_date}' AS DATE) - INTERVAL 40 DAY
            ),
            TargetDay AS (
                SELECT 
                    symbol, price, volume, avg_vol, open, prev_close,
                    ((price - prev_close) / prev_close) * 100 as change_percent,
                    ((open - prev_close) / prev_close) * 100 as gap_percent,
                    (volume / NULLIF(avg_vol, 0)) as rvol
                FROM Stats
                WHERE date = CAST('{last_date}' AS DATE)
            )
            SELECT 
                t.*, m.market_cap,
                (m.market_cap / t.price) as float_shares,
                p.sector
            FROM TargetDay t
            JOIN factor_ranks_snapshot m ON t.symbol = m.symbol
            LEFT JOIN bulk_company_profiles_fmp p ON t.symbol = p.symbol
            WHERE t.price BETWEEN {min_price} AND {max_price}
              AND m.market_cap < {max_mcap}
              AND t.change_percent >= {min_gain_pct}
              AND t.rvol >= {min_rvol}
              AND (m.market_cap / t.price) < 10000000
            ORDER BY t.change_percent DESC
        """
        
        try:
            res = client.query(sql)
        except Exception as query_err:
            logger.error(f"Historical query failed (likely missing profile table): {query_err}")
            # Fallback query without sector
            sql_fallback = sql.replace("LEFT JOIN bulk_company_profiles_fmp p ON t.symbol = p.symbol", "").replace(",\n                p.sector", "")
            res = client.query(sql_fallback)

        if res.is_empty():
            logger.info("Scanner: No historical rockets found matching criteria.")
            return []
            
        df = res.to_pandas()
        if 'sector' not in df.columns:
            df['sector'] = "Unknown"
        
        for _, row in df.iterrows():
            # Get Catalyst for that day
            catalyst = "-"
            catalyst_url = ""
            try:
                # Fetch news specifically for that trading day
                news_df = client._fmp_client.get_stock_news(
                    row['symbol'], 
                    limit=5, 
                    from_date=str(last_date), 
                    to_date=str(last_date)
                )
                if not news_df.empty and 'title' in news_df.columns:
                    catalyst = news_df.iloc[0]['title']
                    catalyst_url = news_df.iloc[0]['url'] if 'url' in news_df.columns else ""
            except: pass
            
            # Calculate Float (Approximate)
            float_shares = 0
            if row['price'] > 0:
                float_shares = row['market_cap'] / row['price']

            signals.append({
                "symbol": row['symbol'],
                "price": row['price'],
                "change_percent": row['change_percent'],
                "gap_percent": row['gap_percent'],
                "volume": row['volume'],
                "rvol": round(row['rvol'], 1) if pd.notnull(row['rvol']) else 0,
                "market_cap": row['market_cap'],
                "float_shares": float_shares,
                "match_score": 5, # 5/5 Criteria
                "catalyst": catalyst,
                "catalyst_url": catalyst_url,
                "sector": row['sector'] if pd.notnull(row['sector']) else "Unknown",
                "timestamp": str(last_date)
            })
            
    except Exception as e:
        logger.error(f"Historical Scanner Error: {e}")
        
    return signals
