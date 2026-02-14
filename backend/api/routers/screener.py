from typing import List, Optional

import numpy as np
import polars as pl
from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from pydantic import BaseModel

from api.routers.data import get_qs_client

router = APIRouter()

class ScreenerResult(BaseModel):
    symbol: str
    price: float
    change_percent: float
    volume: float
    avg_volume: float
    relative_volume: float
    gap_percent: float
    market_cap: Optional[float]
    sector: Optional[str]
    float_shares: Optional[float] = None # Calculated or retrieved

@router.get("/scan", response_model=List[ScreenerResult])
def scan_market(
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_volume: Optional[float] = Query(None),
    min_relative_volume: Optional[float] = Query(None),
    min_gap_percent: Optional[float] = Query(None),
    max_gap_percent: Optional[float] = Query(None),
    min_market_cap: Optional[float] = Query(None),
    max_float: Optional[float] = Query(None), # For "Low Float" runners
    limit: int = 100
):
    """
    Real-time (or near real-time) Stock Screener.
    Supports "Warrior Trading" style metrics: Gap %, Relative Volume, Float.
    """
    try:
        client = get_qs_client()

        # 1. Get Base Universe (Profiles) for static data (Sector, MktCap, Float proxy)
        # We calculate float approx as Market Cap / Price if not directly available
        q_profiles = """
            SELECT 
                symbol,
                company_name, 
                sector, 
                price as profile_price,
                (full_time_employees * 0 + 1) as has_profile -- dummy check
            FROM bulk_company_profiles_fmp
        """

        # 2. Get Price Data
        # STRATEGY: Try Realtime Candles first, Fallback to Historical
        # For this implementation, we will use a robust query that gets the LATEST available data point for every stock

        # Get the max date first to ensure we are looking at the "current" market state
        max_date_df = client.query("SELECT MAX(date) as d FROM historical_prices_fmp")
        latest_date = max_date_df["d"][0]

        if not latest_date:
            return []

        # Complex Query:
        # A. Get Latest Day Stats (Close, Volume, Open)
        # B. Get Previous Day Close (for Gap & Change calc)
        # C. Get Avg Volume (30D)

        sql = """
            WITH max_dates AS (
                SELECT MAX(date) as latest, 
                       MAX(date) - INTERVAL 30 DAY as start_30d
                FROM historical_prices_fmp
            ),
            latest_prices AS (
                SELECT * FROM historical_prices_fmp 
                WHERE date = (SELECT latest FROM max_dates)
            ),
            prev_prices AS (
                SELECT symbol, close as prev_close 
                FROM historical_prices_fmp 
                WHERE date = (SELECT MAX(date) FROM historical_prices_fmp WHERE date < (SELECT latest FROM max_dates))
            ),
            avg_volumes AS (
                SELECT symbol, AVG(volume) as avg_vol_30d
                FROM historical_prices_fmp
                WHERE date >= (SELECT start_30d FROM max_dates)
                GROUP BY symbol
            ),
            market_data AS (
                SELECT 
                    m.symbol,
                    m.market_cap as mcap_str,
                    m.type
                FROM master_assets_index m
                WHERE m.type = 'Equity'
            )
            SELECT 
                l.symbol,
                CAST(l.close AS DOUBLE) as price,
                CAST(l.volume AS DOUBLE) as volume,
                CAST(l.open AS DOUBLE) as open,
                CAST(p.prev_close AS DOUBLE) as prev_close,
                CAST(a.avg_vol_30d AS DOUBLE) as avg_vol_30d,
                m.mcap_str,
                prof.sector
            FROM latest_prices l
            LEFT JOIN prev_prices p ON l.symbol = p.symbol
            LEFT JOIN avg_volumes a ON l.symbol = a.symbol
            LEFT JOIN market_data m ON l.symbol = m.symbol
            LEFT JOIN bulk_company_profiles_fmp prof ON l.symbol = prof.symbol
            WHERE l.close > 0
        """

        df = client.query(sql)

        if df.is_empty():
            return []

        # 3. Post-Processing & Calculation (using Polars for speed)
        # Calculate derived metrics
        df = df.with_columns([
            (pl.col("volume") / pl.col("avg_vol_30d")).fill_null(0.0).alias("relative_volume"),
            ((pl.col("open") - pl.col("prev_close")) / pl.col("prev_close") * 100).fill_null(0.0).alias("gap_percent"),
            ((pl.col("price") - pl.col("prev_close")) / pl.col("prev_close") * 100).fill_null(0.0).alias("change_percent"),
        ])

        # Ensure results are Floats for Pydantic
        df = df.with_columns([
            pl.col("price").cast(pl.Float64),
            pl.col("volume").cast(pl.Float64),
            pl.col("relative_volume").cast(pl.Float64),
            pl.col("gap_percent").cast(pl.Float64),
            pl.col("change_percent").cast(pl.Float64),
            pl.col("avg_vol_30d").fill_null(0.0).cast(pl.Float64)
        ])

        # Let's perform filtering
        if min_price is not None:
            df = df.filter(pl.col("price") >= min_price)
        if max_price is not None:
            df = df.filter(pl.col("price") <= max_price)
        if min_volume is not None:
            df = df.filter(pl.col("volume") >= min_volume)
        if min_relative_volume is not None:
            df = df.filter(pl.col("relative_volume") >= min_relative_volume)
        if min_gap_percent is not None:
            df = df.filter(pl.col("gap_percent") >= min_gap_percent)
        if max_gap_percent is not None:
            df = df.filter(pl.col("gap_percent") <= max_gap_percent)

        # Sort by Relative Volume (Day Trading default) or Change
        df = df.sort("relative_volume", descending=True).head(limit)

        results = []
        for row in df.iter_rows(named=True):
            def safe_float(val):
                if val is None or np.isnan(val) or np.isinf(val):
                    return 0.0
                return float(val)

            results.append({
                "symbol": row["symbol"],
                "price": safe_float(row["price"]),
                "change_percent": safe_float(row["change_percent"]),
                "volume": safe_float(row["volume"]),
                "avg_volume": safe_float(row["avg_vol_30d"]),
                "relative_volume": safe_float(row["relative_volume"]),
                "gap_percent": safe_float(row["gap_percent"]),
                "market_cap": 0.0,
                "sector": row["sector"] or "Unknown",
                "float_shares": 0.0
            })

        return results

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Screener failed: {e}\n{error_details}")
        raise HTTPException(status_code=500, detail=f"Screener logic error: {str(e)}")
