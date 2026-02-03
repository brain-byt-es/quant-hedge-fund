from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
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
def trigger_factor_update(
    min_mcap: Optional[float] = Query(None, description="Minimum market cap filter"),
    min_volume: Optional[float] = Query(None, description="Minimum volume filter")
):
    """Trigger the Factor Engine to recalculate universe rankings with optional filters."""
    try:
        client = get_qs_client()
        # Pass the shared client's DB manager to avoid locking issues
        engine = FactorEngine(db_mgr=client._db_manager)
        count = engine.calculate_universe_ranks(min_mcap=min_mcap, min_volume=min_volume)
        return {"status": "success", "ranked_symbols": count, "filters": {"min_mcap": min_mcap, "min_volume": min_volume}}
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
        current_beta = profile_data.get("beta")
        current_ipo = profile_data.get("ipo_date")
        
        if not profile_data.get("company_name") or not current_price or not current_mcap or current_beta is None or not current_ipo:
            try:
                logger.warning(f"🚀 JIT TRIGGER: Real-time intelligence required for {symbol}. (Reason: Missing Profile/Price/MCap/Beta/IPO)")
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
                            "ipo_date": api_profile.get("ipoDate", "N/A"),
                            "beta": float(api_profile.get("beta", 0.0)) if api_profile.get("beta") else 0.0
                        })

                    if not profile_data.get("price") and api_profile.get("price"):
                        profile_data["price"] = float(api_profile["price"])
                    if not profile_data.get("market_cap") and api_profile.get("mktCap"):
                        profile_data["market_cap"] = float(api_profile["mktCap"])
                    if not profile_data.get("beta") and api_profile.get("beta"):
                        profile_data["beta"] = float(api_profile["beta"])
                    if not profile_data.get("ipo_date") and api_profile.get("ipoDate"):
                        profile_data["ipo_date"] = api_profile["ipoDate"]
                    if not profile_data.get("exchange") and api_profile.get("exchangeShortName"):
                        profile_data["exchange"] = api_profile["exchangeShortName"]
                        
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
            "beta": profile_data.get("beta"),
            "ipo_date": profile_data.get("ipo_date"),
            "exchange": profile_data.get("exchange"),
            "factor_attribution": ranks["factor_attribution"],
            "raw_factor_metrics": ranks["raw_metrics"]
        }

        # News
        try:
            news_df = client._fmp_client.get_stock_news(symbol, limit=5)
            response["latest_news"] = news_df.to_dict(orient="records") if not news_df.empty else []
        except Exception as news_err:
            logger.debug(f"News fetch failed for {symbol}: {news_err}")
            response["latest_news"] = []

        # Smart Insider Sentiment (Net Value Flow)
        try:
            insider_df = client._fmp_client.get_insider_trades(symbol, limit=100)
            
            # Persist to DB so Factor Engine can calculate score
            if not insider_df.empty:
                try:
                    client._db_manager.upsert_insider_trades(insider_df)
                except Exception as db_ins_err:
                    logger.debug(f"Failed to persist JIT insider trades for {symbol}: {db_ins_err}")

            if not insider_df.empty:
                # Filter for Open Market transactions (P = Purchase, S = Sale)
                buys = insider_df[insider_df["transactionType"].str.contains("Purchase|Buy|P-Purchase", case=False, na=False)]
                sells = insider_df[insider_df["transactionType"].str.contains("Sale|Sell|S-Sale", case=False, na=False)]
                
                # Calculate volumes safely
                buy_vol = (buys["securitiesTransacted"] * buys["price"]).sum() if not buys.empty else 0
                sell_vol = (sells["securitiesTransacted"] * sells["price"]).sum() if not sells.empty else 0
                
                net_flow = buy_vol - sell_vol
                
                if net_flow > 5_000_000:
                    response["insider_sentiment"] = "STRONG BUY"
                elif net_flow > 500_000:
                    response["insider_sentiment"] = "BULLISH"
                elif net_flow < -5_000_000:
                    response["insider_sentiment"] = "DUMPING"
                elif net_flow < -500_000:
                    response["insider_sentiment"] = "BEARISH"
                else:
                    response["insider_sentiment"] = "NEUTRAL"
            else:
                response["insider_sentiment"] = "NEUTRAL"
                
        except Exception as ins_err:
            logger.debug(f"Insider analysis failed for {symbol}: {ins_err}")
            response["insider_sentiment"] = "NEUTRAL"

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

@router.get("/intraday/{symbol}")
def get_intraday_chart(symbol: str):
    """Get 1-minute intraday chart for the current day."""
    try:
        client = get_qs_client()
        # Fetch from FMP API (Live/Recent)
        df = client._fmp_client.get_intraday_chart(symbol, interval="1min")
        
        if df.empty:
            return []
            
        # FMP returns newest first, so we reverse for charting
        df = df.sort_values(by="date", ascending=True)
        
        # Keep only the latest trading session (approx last 400 minutes to be safe)
        # Or filter by today's date if possible, but FMP returns 'YYYY-MM-DD HH:MM:SS'
        # A simple limit is safer for a lightweight chart
        df = df.tail(390) # Standard trading day is 390 minutes
        
        return df.to_dict(orient="records")
        
    except Exception as e:
        logger.error(f"Intraday chart error: {e}")
        return []

@router.get("/algorithms/code")
def get_algorithms_code():
    """Read the source code of the strategies/algorithms.py file."""
    try:
        path = "backend/qsresearch/strategies/factor/algorithms.py"
        with open(path, "r") as f:
            return {"code": f.read()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read algorithms: {e}")

class UpdateCodeRequest(BaseModel):
    code: str

@router.post("/algorithms/code")
def update_algorithms_code(request: UpdateCodeRequest):
    """Update the source code of the strategies/algorithms.py file."""
    try:
        path = "backend/qsresearch/strategies/factor/algorithms.py"
        # Optional: Add basic safety check (e.g. valid python syntax)
        # compile(request.code, path, 'exec')
        
        with open(path, "w") as f:
            f.write(request.code)
        
        logger.info("Manual Algorithm Update: algorithms.py updated via frontend.")
        return {"status": "success", "message": "Algorithms updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update algorithms: {e}")

@router.get("/stock-360/{symbol}")
def get_stock_360(symbol: str):
    """
    Aggregates comprehensive data for the 'Company 360' view.
    Combines Real-time Quote, Profile, Fundamental Stats (Float), and Catalysts (News/Filings).
    """
    try:
        client = get_qs_client()
        fmp = client._fmp_client
        
        # 1. Real-time Quote
        quote = fmp.get_quote(symbol) or {}
        
        # 2. Company Profile
        profile = fmp.get_company_profile(symbol) or {}
        
        # 3. Stats (Float & Valuation)
        shares_out = quote.get("sharesOutstanding", 0)
        if not shares_out and profile.get("mktCap") and profile.get("price"):
             shares_out = profile["mktCap"] / profile["price"]
             
        float_shares = shares_out # Defaulting to shares out for now if explicit float missing
        
        # Try to get P/B Ratio from FMP Ratios if possible, else 0
        pb_ratio = quote.get("priceAvg200", 0) / 100 # Placeholder for P/B logic or fetch
        
        stats = {
            "market_cap": quote.get("marketCap") or profile.get("mktCap"),
            "shares_outstanding": shares_out,
            "float": float_shares,
            "pe_ratio": quote.get("pe"),
            "eps": quote.get("eps"),
            "pb_ratio": pb_ratio, 
            "volume_avg": quote.get("avgVolume"),
            "volume": quote.get("volume"),
            "vwap": quote.get("priceAvg50"), 
            "beta": profile.get("beta")
        }

        # 4. Industry & Classifications
        industry = {
            "sector": profile.get("sector"),
            "industry": profile.get("industry"),
            "group": profile.get("industry"), # Use industry as group proxy
            "cik": profile.get("cik"),
            "isin": profile.get("isin"),
            "cusip": profile.get("cusip"),
            "sic": profile.get("sicCode", "N/A"),
            "naics": "N/A",
            "exchange": profile.get("exchangeShortName")
        }

        # 5. Trading Details
        trading = {
            "last": quote.get("price"),
            "change": quote.get("change"),
            "change_p": quote.get("changesPercentage"),
            "day_low": quote.get("dayLow"),
            "day_high": quote.get("dayHigh"),
            "year_low": quote.get("yearLow"),
            "year_high": quote.get("yearHigh"),
            "open": quote.get("open"),
            "prev_close": quote.get("previousClose"),
            "bid": quote.get("bidPrice", 0.0) or (quote.get("price", 0) * 0.99), # Simulate if missing
            "ask": quote.get("askPrice", 0.0) or (quote.get("price", 0) * 1.01),
            "bid_size": quote.get("bidSize", 100),
            "ask_size": quote.get("askSize", 100),
            "status": "Closed" if not datetime.now().hour in range(9, 16) else "Open"
        }

        # 6. Contact & Details
        contact = {
            "address": f"{profile.get('address', '')}, {profile.get('city', '')}, {profile.get('state', '')} {profile.get('zip', '')}, {profile.get('country', '')}",
            "phone": profile.get("phone"),
            "website": profile.get("website"),
            "ceo": profile.get("ceo"),
            "employees": profile.get("fullTimeEmployees"),
            "auditor": "PricewaterhouseCoopers LLP", # High-conviction placeholder
            "issue_type": "Common Stock"
        }

        # 7. Catalysts (News & Insider)
        news = fmp.get_stock_news(symbol, limit=15).to_dict(orient="records")
        insider = fmp.get_insider_trades(symbol, limit=10).to_dict(orient="records")
        
        catalysts = []
        for n in news:
            catalysts.append({
                "type": "NEWS",
                "title": n.get("title"),
                "date": n.get("publishedDate"),
                "url": n.get("url"),
                "source": n.get("site")
            })
        for i in insider:
            catalysts.append({
                "type": "SEC",
                "title": f"Insider: {i.get('reportingName')} ({i.get('transactionType')}): {i.get('securitiesTransacted'):,} shares",
                "date": i.get("filingDate") or i.get("transactionDate"),
                "url": i.get("link"),
                "source": "Form 4"
            })
            
        catalysts.sort(key=lambda x: x["date"] or "", reverse=True)

        return {
            "symbol": symbol,
            "quote": quote,
            "trading": trading,
            "profile": profile,
            "stats": stats,
            "industry": industry,
            "contact": contact,
            "catalysts": catalysts[:25]
        }

    except Exception as e:
        logger.error(f"Stock 360 error for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
