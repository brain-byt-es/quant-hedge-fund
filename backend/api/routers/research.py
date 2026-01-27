from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

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
    """Get company profile from bulk_company_profiles_fmp."""
    try:
        client = get_qs_client()
        # Try fetch from DB
        try:
            res = client.query(f"SELECT * FROM bulk_company_profiles_fmp WHERE symbol = '{symbol}'")
            if not res.is_empty():
                return res.to_dicts()[0]
        except:
            pass
            
        # Fallback Mock if DB empty/busy
        return {
            "symbol": symbol,
            "company_name": f"{symbol} Corp (Mock)",
            "sector": "Technology",
            "industry": "Computer Hardware",
            "description": "Mock description for UI development. This company specializes in quantum computing and cloud services.",
            "price": 25.38,
            "beta": 1.69,
            "exchange": "NASDAQ",
            "website": "https://example.com",
            "full_time_employees": 137,
            "market_cap": 8380000000,
            "ipo_date": "2021-04-22"
        }
    except Exception as e:
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
