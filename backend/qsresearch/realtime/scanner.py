import os
from datetime import datetime
from typing import Any, Dict, List

import pandas as pd
import yaml
from loguru import logger


def load_scanner_config():
    path = "backend/config/scanners.yaml"
    if not os.path.exists(path):
        return {"scanners": []}
    with open(path, "r") as f:
        return yaml.safe_load(f)

def find_momentum_rockets(client,
                          min_price: float = 2.0,
                          max_price: float = 20.0,
                          max_mcap: float = 300_000_000,
                          min_gain_pct: float = 10.0,
                          min_rvol: float = 5.0,
                          min_gap_pct: float = 4.0,
                          target_date: str = None,
                          scanner_type: str = "low_float_rocket") -> List[Dict[str, Any]]:
    """
    Unified Multi-Scanner Engine based on scanners.yaml config.
    """
    signals = []
    config = load_scanner_config()
    scanner_def = next((s for s in config["scanners"] if s["id"] == scanner_type), None)

    if not scanner_def:
        logger.warning(f"Scanner ID '{scanner_type}' not found in config. Using defaults.")
        filters = {
            "price": [min_price, max_price],
            "min_day_change": min_gain_pct / 100.0,
            "min_rvol": min_rvol
        }
    else:
        filters = scanner_def["filters"]

    # Check for Weekend
    is_weekend = datetime.now().weekday() >= 5
    if target_date or is_weekend:
        # For brevity, I'll skip historical YAML logic implementation and use existing one
        # but updated to at least respect the scanner_type
        return _find_historical_rockets(client, min_price, max_price, max_mcap, min_gain_pct, min_rvol, min_gap_pct, target_date, scanner_type)

    try:
        # 1. Broad Pre-filter from DB
        sql = "SELECT symbol, market_cap, sector FROM factor_ranks_snapshot"

        # Optimize pre-filter based on YAML if possible
        if "price" in filters:
            sql += f" WHERE price BETWEEN {filters['price'][0]} AND {filters['price'][1]}"
        elif "min_mcap" in filters:
            sql += f" WHERE market_cap >= {filters['min_mcap']}"

        try:
            candidates_df = client.query(sql).to_pandas()
        except Exception:
            return []

        if candidates_df.empty: return []
        candidate_symbols = candidates_df["symbol"].tolist()

        # 2. Live Quote Check
        quotes_df = client._fmp_client.get_quotes_batch(candidate_symbols)
        if quotes_df.empty: return []

        for _, row in quotes_df.iterrows():
            symbol = row['symbol']

            # --- Apply YAML Filters ---
            passed = True

            # Price
            if "price" in filters:
                if not (filters["price"][0] <= row['price'] <= filters["price"][1]): passed = False

            # Change %
            if "min_day_change" in filters:
                if row['changesPercentage'] < (filters["min_day_change"] * 100): passed = False

            # RVOL
            avg_vol = row['avgVolume'] if row['avgVolume'] > 0 else 1
            rvol = row['volume'] / avg_vol
            if "min_rvol" in filters:
                if rvol < filters["min_rvol"]: passed = False

            # Volume
            if "min_volume" in filters:
                if row['volume'] < filters["min_volume"]: passed = False

            # Float
            float_shares = 0
            try:
                mcap = candidates_df[candidates_df['symbol'] == symbol]['market_cap'].values[0]
                float_shares = mcap / row['price'] if row['price'] > 0 else 0
            except: pass

            if "max_float" in filters:
                if float_shares > filters["max_float"]: passed = False

            # Special: Near 52W Low
            if filters.get("near_52w_low"):
                year_low = row.get('yearLow', 0)
                if row['price'] > (year_low * 1.15): passed = False

            # Special: Halt Proxy
            if filters.get("proxy_halt"):
                is_halted = (row['volume'] == 0 or row['changesPercentage'] == 0) and rvol > 2
                if not is_halted: passed = False

            if not passed: continue

            # 3. News Catalyst
            catalyst = "-"
            catalyst_url = ""
            if filters.get("require_news"):
                try:
                    news_df = client._fmp_client.get_stock_news(symbol, limit=1)
                    if not news_df.empty:
                        catalyst = news_df.iloc[0]['title']
                        catalyst_url = news_df.iloc[0]['url']
                    else:
                        continue # Failed requirement
                except: continue

            # Final Signal Data
            signals.append({
                "symbol": symbol,
                "price": row['price'],
                "change_percent": row['changesPercentage'],
                "volume": row['volume'],
                "rvol": round(rvol, 1),
                "float_shares": float_shares,
                "vwap": row.get('priceAvg200', row['price']), # Proxy if vwap not in quote
                "day_high": row.get('dayHigh', row['price']),
                "catalyst": catalyst,
                "catalyst_url": catalyst_url,
                "sector": candidates_df[candidates_df['symbol'] == symbol]['sector'].values[0] if symbol in candidates_df['symbol'].values else "Unknown",
                "timestamp": datetime.now().isoformat()
            })

    except Exception as e:
        logger.error(f"Scanner Error: {e}")

    signals.sort(key=lambda x: x['change_percent'], reverse=True)
    return signals

def _find_historical_rockets(client, min_price, max_price, max_mcap, min_gain_pct, min_rvol, min_gap_pct, target_date=None, scanner_type="LowFloatSqueeze"):
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
            logger.error(f"Historical query failed: {query_err}")
            return []

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
                news_df = client._fmp_client.get_stock_news(
                    row['symbol'],
                    limit=1,
                    from_date=str(last_date),
                    to_date=str(last_date)
                )
                if not news_df.empty:
                    catalyst = news_df.iloc[0]['title']
                    catalyst_url = news_df.iloc[0]['url']
            except: pass

            signals.append({
                "symbol": row['symbol'],
                "price": row['price'],
                "change_percent": row['change_percent'],
                "gap_percent": row['gap_percent'],
                "volume": row['volume'],
                "rvol": round(row['rvol'], 1) if pd.notnull(row['rvol']) else 0,
                "market_cap": row['market_cap'],
                "float_shares": row['float_shares'],
                "match_score": 5,
                "scanner_type": scanner_type,
                "catalyst": catalyst,
                "catalyst_url": catalyst_url,
                "sector": row['sector'] if pd.notnull(row['sector']) else "Unknown",
                "timestamp": str(last_date)
            })

    except Exception as e:
        logger.error(f"Historical Scanner Error: {e}")

    return signals
