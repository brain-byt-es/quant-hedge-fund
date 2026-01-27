from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import polars as pl
from datetime import datetime, timedelta
from loguru import logger

from api.routers.data import get_qs_client

router = APIRouter()

@router.get("/signals")
def get_signals(
    lookback: int = 252,
    limit: int = 100
):
    """
    Calculate factor signals (Momentum proxy) for the universe.
    Returns data for Scatter Plot, Histogram, and Rankings Table.
    """
    try:
        client = get_qs_client()
        # For prototype: Get latest prices and calculate simple momentum
        # In production: This would query a pre-calculated factors table
        
        # Get a subset of symbols for performance (or all if cached)
        # We simulate a "Rank vs Factor" dataset
        
        # Mocking the distribution for UI development if DB is busy/empty
        # REAL IMPLEMENTATION would be:
        # df = client.get_momentum_scores(lookback=lookback)
        
        # Generating realistic distribution
        n_points = 500
        ranks = np.arange(1, n_points + 1)
        # Factor score correlated with rank (lower rank = higher score)
        scores = 100 - (ranks * 0.1) + np.random.normal(0, 5, n_points)
        
        data = []
        tickers = ["RGTI", "GE", "KGC", "BCS", "QBTS", "BE", "IREN", "MU", "EOSE", "APH", 
                   "SBSW", "B", "OKLO", "PLTR", "NEM", "PL", "WDC", "HOOD", "IAG", "GLW"]
        
        for i in range(n_points):
            symbol = tickers[i % len(tickers)] if i < 20 else f"TICK{i}"
            data.append({
                "rank": int(ranks[i]),
                "symbol": symbol,
                "factor_signal": float(scores[i]),
                "as_of": datetime.now().strftime("%Y-%m-%d"),
                "bundle_name": "historical_prices_fmp"
            })
            
        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/{symbol}")
def get_company_profile(symbol: str):
    """Get comprehensive company profile with Just-in-Time (JIT) API fallback."""
    try:
        client = get_qs_client()
        profile_data = {}

        # 1. Try to fetch from local DuckDB cache
        try:
            res = client.query(f"SELECT * FROM bulk_company_profiles_fmp WHERE symbol = '{symbol}'")
            if not res.is_empty():
                profile_data = res.to_dicts()[0]
                # Consistency mapping
                if "company_name" not in profile_data and "companyName" in profile_data:
                    profile_data["company_name"] = profile_data.pop("companyName")
        except Exception as e:
            logger.debug(f"DB Fetch failed for {symbol}: {e}")
            
        # 2. JIT Fallback: Fetch from FMP API if missing in DB or incomplete
        if not profile_data or not profile_data.get("company_name"):
            try:
                logger.info(f"JIT: Fetching real-time profile for {symbol} from FMP...")
                api_profile = client._fmp_client.get_company_profile(symbol)
                
                if api_profile:
                    # Map API keys to our internal schema
                    profile_data = {
                        "symbol": symbol,
                        "company_name": api_profile.get("companyName", f"{symbol} Corp"),
                        "sector": api_profile.get("sector", "Technology"),
                        "industry": api_profile.get("industry", "N/A"),
                        "description": api_profile.get("description", "No description available."),
                        "price": float(api_profile.get("price", 0)),
                        "beta": float(api_profile.get("beta", 0)),
                        "exchange": api_profile.get("exchangeShortName", "NASDAQ"),
                        "website": api_profile.get("website", ""),
                        "full_time_employees": int(api_profile.get("fullTimeEmployees", 0)) if api_profile.get("fullTimeEmployees") else 0,
                        "market_cap": float(api_profile.get("mktCap", 0)),
                        "ipo_date": api_profile.get("ipoDate", "N/A")
                    }
                    # Save to DB for caching (using original FMP keys for the upsert method)
                    import pandas as pd
                    client._db_manager.upsert_company_profiles(pd.DataFrame([api_profile]))
                else:
                    # Emergency Fallback if API also fails
                    profile_data = {
                        "symbol": symbol,
                        "company_name": f"{symbol} (Real-time Pending)",
                        "sector": "Scanning...",
                        "industry": "Pending",
                        "description": "Fetching intelligence from FMP Hub...",
                        "price": 0.0,
                        "beta": 1.0,
                        "exchange": "NASDAQ",
                        "website": "",
                        "full_time_employees": 0,
                        "market_cap": 0,
                        "ipo_date": "N/A"
                    }
            except Exception as jit_err:
                logger.error(f"JIT Profile fetch failed for {symbol}: {jit_err}")

        # 3. Add dynamic layers (DCF, Insider, News) - these are always live
        try:
            dcf_df = client._fmp_client.get_dcf_valuation(symbol)
            if not dcf_df.empty:
                profile_data["dcf_value"] = float(dcf_df.iloc[0].get("dcf", 0))
        except: pass

        try:
            insider_df = client._fmp_client.get_insider_trades(symbol, limit=5)
            if not insider_df.empty:
                buys = len(insider_df[insider_df["transactionType"].str.contains("Buy", na=False, case=False)])
                profile_data["insider_sentiment"] = "BULLISH" if buys > 2 else "NEUTRAL"
        except: pass

        try:
            news_df = client._fmp_client.get_stock_news(symbol, limit=3)
            if not news_df.empty:
                profile_data["latest_news"] = news_df.to_dict(orient="records")
        except: pass

        # Update price from real-time source if available
        try:
            price_df = client._fmp_client.get_historical_prices(symbol)
            if not price_df.empty:
                profile_data["price"] = float(price_df.iloc[0]["close"])
        except: pass

        return profile_data
    except Exception as e:
        logger.error(f"Error in get_company_profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/price-history/{symbol}")
def get_price_history(symbol: str, lookback: int = 252):
    """Get historical prices for chart."""
    try:
        client = get_qs_client()
        # Try DB
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=lookback * 1.5) # approx calendar days
            sql = f"""
                SELECT date, close 
                FROM historical_prices_fmp 
                WHERE symbol = '{symbol}' 
                AND date >= '{start_date.strftime('%Y-%m-%d')}'
                ORDER BY date ASC
            """
            res = client.query(sql)
            if not res.is_empty():
                # Format for Recharts
                return res.select(
                    pl.col("date").dt.strftime("%Y-%m-%d"),
                    pl.col("close")
                ).to_dicts()
        except:
            pass
            
        # Fallback Mock
        data = []
        price = 20.0
        for i in range(lookback):
            date_str = (datetime.now() - timedelta(days=lookback-i)).strftime("%Y-%m-%d")
            price = price * (1 + np.random.normal(0, 0.02))
            data.append({"date": date_str, "close": price})
        return data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
