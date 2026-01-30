from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import polars as pl
from datetime import datetime, timedelta
from loguru import logger

from api.routers.data import get_qs_client

from qsresearch.features.factor_engine import FactorEngine

router = APIRouter()

@router.post("/update_factors")
def trigger_factor_update():
    """Trigger the Factor Engine to recalculate universe rankings."""
    try:
        client = get_qs_client()
        # Pass the shared client's DB manager to avoid locking issues
        engine = FactorEngine(db_mgr=client._db_manager)
        count = engine.calculate_universe_ranks()
        return {"status": "success", "ranked_symbols": count}
    except Exception as e:
        logger.error(f"Factor update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/signals")
def get_signals(
    lookback: int = 252,
    limit: int = 5000,
    sort_by: str = "momentum_score"
):
    """
    Get Factor Rankings from the Factor Engine Snapshot.
    Returns pre-calculated percentile scores for the entire universe.
    """
    try:
        client = get_qs_client()
        
        # Validate sort column
        valid_cols = ["momentum_score", "quality_score", "value_score", "growth_score", "safety_score", "f_score"]
        if sort_by not in valid_cols:
            sort_by = "momentum_score"
            
        try:
            sql = f"""
                SELECT 
                    symbol,
                    price,
                    volume,
                    market_cap,
                    change_1d as change_percent,
                    ROUND(momentum_score, 1) as momentum,
                    ROUND(quality_score, 1) as quality,
                    ROUND(value_score, 1) as value,
                    ROUND(growth_score, 1) as growth,
                    ROUND(safety_score, 1) as safety,
                    f_score,
                    as_of
                FROM factor_ranks_snapshot
                WHERE price > 0.5 
                  AND price < 5000000 -- Filter data errors
                  AND market_cap > 1000000 -- Min $1M Cap
                ORDER BY {sort_by} DESC
                LIMIT {limit}
            """
            
            res = client.query(sql)
            
            if res.is_empty():
                # Fallback: Trigger calculation if empty
                from qsresearch.features.factor_engine import FactorEngine
                engine = FactorEngine(db_mgr=client._db_manager)
                engine.calculate_universe_ranks()
                res = client.query(sql) # Retry
                
            df = res.to_pandas()
            df['rank'] = range(1, len(df) + 1)
            
            # Format for frontend (Handle NaN for JSON compliance)
            return df.replace({np.nan: None}).to_dict(orient="records")
            
        except Exception as db_err:
            logger.error(f"Signal Snapshot Query failed: {db_err}")
            return []

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/{symbol}")
def get_company_profile(symbol: str):
    """Get comprehensive company profile with Just-in-Time (JIT) API fallback."""
    try:
        client = get_qs_client()
        profile_data = {}
        api_profile = {} # Initialize early

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
            
        # 2. Dynamic Price & Market Cap Recovery (SimFin Native)
        if profile_data.get("price", 0) == 0 or profile_data.get("market_cap", 0) == 0:
            try:
                # Calculate Market Cap: Price * Shares
                sql_mcap = f"""
                    SELECT 
                        (SELECT close FROM historical_prices_fmp WHERE symbol = '{symbol}' ORDER BY date DESC LIMIT 1) as price,
                        (
                            SELECT "Shares (Basic)" 
                            FROM (
                                SELECT "Shares (Basic)", date FROM bulk_income_quarter_fmp WHERE symbol = '{symbol}' AND "Shares (Basic)" IS NOT NULL
                                UNION ALL
                                SELECT "Shares (Basic)", date FROM bulk_income_banks_quarter_fmp WHERE symbol = '{symbol}' AND "Shares (Basic)" IS NOT NULL
                                UNION ALL
                                SELECT "Shares (Basic)", date FROM bulk_income_insurance_quarter_fmp WHERE symbol = '{symbol}' AND "Shares (Basic)" IS NOT NULL
                            ) combined_shares
                            ORDER BY date DESC LIMIT 1
                        ) as shares
                """
                res = client.query(sql_mcap)
                if not res.is_empty():
                    price_val = float(res["price"][0]) if res["price"][0] else 0.0
                    shares_val = float(res["shares"][0]) if res["shares"][0] else 0.0
                    
                    if price_val > 0: profile_data["price"] = price_val
                    if price_val > 0 and shares_val > 0: 
                        profile_data["market_cap"] = price_val * shares_val
                        logger.info(f"✅ Calculated SimFin Market Cap for {symbol}: ${profile_data['market_cap']:,.0f}")
            except Exception as calc_err:
                logger.debug(f"SimFin Market Cap calc failed: {calc_err}")

        # 3. JIT Fallback (FMP)
        current_price = profile_data.get("price")
        current_mcap = profile_data.get("market_cap")
        
        if not profile_data.get("company_name") or not current_price or not current_mcap:
            try:
                logger.warning(f"🚀 JIT TRIGGER: Real-time intelligence required for {symbol}. (Reason: Missing Profile/Price/MCap)")
                api_profile = client._fmp_client.get_company_profile(symbol)
                
                if api_profile:
                    if not profile_data.get("company_name"):
                        profile_data.update({
                            "symbol": symbol,
                            "company_name": api_profile.get("companyName", f"{symbol} Corp"),
                            "sector": api_profile.get("sector", "Technology"),
                            "industry": api_profile.get("industry", "N/A"),
                            "description": api_profile.get("description", "No description available."),
                            "website": api_profile.get("website", ""),
                            "ceo": api_profile.get("ceo", ""),
                            "full_time_employees": int(api_profile.get("fullTimeEmployees", 0)) if api_profile.get("fullTimeEmployees") else 0,
                            "exchange": api_profile.get("exchangeShortName", "NASDAQ"),
                            "ipo_date": api_profile.get("ipoDate", "N/A")
                        })

                    if not profile_data.get("price") and api_profile.get("price"):
                        profile_data["price"] = float(api_profile["price"])
                    if not profile_data.get("market_cap") and api_profile.get("mktCap"):
                        profile_data["market_cap"] = float(api_profile["mktCap"])
                        
                    # Cache back to DB
                    try:
                        import pandas as pd
                        client._db_manager.upsert_company_profiles(pd.DataFrame([api_profile]))
                    except: pass
            except Exception as jit_err:
                logger.error(f"❌ JIT Fallback failed for {symbol}: {jit_err}")

        # 4. Final Data Assembly
        if not profile_data.get("company_name"):
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found.")

        # Factor Ranks
        try:
            engine = FactorEngine(db_mgr=client._db_manager)
            ranks = engine.get_ranks(symbol)
        except: ranks = None
        
        if not ranks:
            ranks = {
                "factor_attribution": [
                    {"factor": "Momentum", "score": 50}, {"factor": "Quality", "score": 50},
                    {"factor": "Growth", "score": 50}, {"factor": "Value", "score": 50},
                    {"factor": "Safety", "score": 50},
                ],
                "raw_metrics": { "f_score": 0 }
            }

        response = {
            "symbol": symbol,
            "company_name": profile_data.get("company_name"),
            "sector": profile_data.get("sector"),
            "industry": profile_data.get("industry"),
            "description": profile_data.get("description"),
            "website": profile_data.get("website"),
            "ceo": profile_data.get("ceo"),
            "full_time_employees": profile_data.get("full_time_employees"),
            "price": profile_data.get("price"),
            "updated_at": profile_data.get("updated_at"),
            "market_cap": profile_data.get("market_cap"),
            "factor_attribution": ranks["factor_attribution"],
            "raw_factor_metrics": ranks["raw_metrics"]
        }

        # News & Insider Trading
        try:
            response["latest_news"] = client._fmp_client.get_stock_news(symbol, limit=5)
            response["insider_sentiment"] = client.get_insider_sentiment(symbol)
        except: pass

        return response
        
    except Exception as e:
        logger.error(f"Error in get_company_profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/monte-carlo/{run_id}")
def get_monte_carlo(run_id: str, simulations: int = 1000):
    """
    Run a Monte Carlo simulation based on a backtest run's performance.
    Determines statistical significance (P-Value).
    """
    from api.routers.backtest import get_mlflow_client
    client = get_mlflow_client()
    
    try:
        run = client.get_run(run_id)
        # In a real system, we'd pull the actual 'equity_curve' artifact from MLflow
        # For this prototype, we simulate based on the run's Sharpe and Return
        sharpe = run.data.metrics.get("sharpe", 1.0)
        ann_return = run.data.metrics.get("annual_return", 0.1)
        
        # Daily parameters
        daily_ret = ann_return / 252
        daily_vol = (ann_return / sharpe) / np.sqrt(252) if sharpe > 0 else 0.02
        
        # Run simulations
        horizon = 252
        paths = np.zeros((simulations, horizon))
        for i in range(simulations):
            # Geometric Brownian Motion proxy
            returns = np.random.normal(daily_ret, daily_vol, horizon)
            paths[i] = np.cumprod(1 + returns)
            
        final_returns = paths[:, -1] - 1
        
        return {
            "run_id": run_id,
            "simulations": simulations,
            "p_value": float(np.mean(final_returns < 0)), # Probability of loss
            "expected_return_mc": float(np.mean(final_returns)),
            "worst_case": float(np.min(final_returns)),
            "best_case": float(np.max(final_returns)),
            "distribution": final_returns.tolist()[:100] # Return sample for histogram
        }
    except Exception as e:
        logger.error(f"Monte Carlo failed: {e}")
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
            else:
                logger.warning(f"No price history found for {symbol}")
                raise HTTPException(status_code=404, detail=f"No data for {symbol}")
                
        except Exception as db_err:
            logger.error(f"Price history query failed: {db_err}")
            raise HTTPException(status_code=500, detail="Database error")
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
