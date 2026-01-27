from prefect import flow, task
from datetime import datetime, date, timedelta
from loguru import logger
from qsconnect import Client as QSConnectClient
import pandas as pd

# ==========================================
# Tasks (Internal Client Initialization)
# ==========================================

@task(retries=3, retry_delay_seconds=60)
def task_update_stock_list():
    """Update US stock list."""
    client = QSConnectClient()
    logger.info("Prefect: Updating Stock List...")
    df = client._fmp_client.get_stock_list()
    client._db_manager.upsert_stock_list(df)
    return f"Updated symbols"

@task(retries=2)
def task_ingest_prices(start_date: str = None, end_date: str = None, desc="Prices"):
    """Ingest prices for a specific range."""
    client = QSConnectClient()
    start_dt = date.fromisoformat(start_date) if start_date else None
    end_dt = date.fromisoformat(end_date) if end_date else None
    
    logger.info(f"Prefect: Ingesting {desc} from {start_date} to {end_date}...")
    client.bulk_historical_prices(start_date=start_dt, end_date=end_dt)
    return f"{desc} sync complete"

@task(retries=0)
def task_ingest_fundamentals(limit: int = 5):
    """Ingest annual financials (Starter Plan) in batches."""
    try:
        client = QSConnectClient()
        fundamental_types = ["income-statement", "balance-sheet-statement", "cash-flow-statement", "ratios", "key-metrics"]
        us_symbols = client._fmp_client.get_stock_list()["symbol"].tolist()
        
        batch_size = 500
        total_symbols = len(us_symbols)
        
        for stmt in fundamental_types:
            logger.info(f"Prefect: Ingesting {stmt} (Annual) - Total Symbols: {total_symbols}")
            
            for i in range(0, total_symbols, batch_size):
                if client.stop_requested:
                    logger.warning("Prefect: Stop signal received. Aborting fundamentals sync.")
                    return "Stopped"

                batch_symbols = us_symbols[i : i + batch_size]
                logger.info(f"  > Processing batch {i // batch_size + 1}/{(total_symbols // batch_size) + 1} ({len(batch_symbols)} symbols)...")
                
                try:
                    data = client._fmp_client.get_starter_fundamentals(
                        symbols=batch_symbols,
                        statement_type=stmt,
                        limit=limit,
                        stop_check=lambda: client.stop_requested
                    )
                    
                    # Robust DataFrame handling (Pandas vs Polars)
                    if isinstance(data, pd.DataFrame):
                        if not data.empty:
                            data = pl.from_pandas(data)
                        else:
                            data = pl.DataFrame()
                    
                    if not data.is_empty():
                        client._db_manager.upsert_fundamentals(stmt, "annual", data)
                        
                except Exception as batch_err:
                    logger.error(f"Batch failed (type={type(data)}): {batch_err}")
                    import traceback
                    logger.error(traceback.format_exc())
                    
    except Exception as e:
        logger.error(f"Fundamentals sync failed: {e}")
        # Do not raise, to prevent retries on 403/404
    return "Fundamentals sync complete"

@task
def task_rebuild_bundle():
    """Finalize data for Zipline."""
    client = QSConnectClient()
    client.build_zipline_bundle("historical_prices_fmp")
    client.ingest_bundle("historical_prices_fmp")
    return "Bundle ready"

# ==========================================
# FLOW 1: Institutional Backfill (Manual)
# ==========================================

@flow(name="Hedge Fund Backfill (5-Year)")
def historical_backfill_flow():
    """Full historical synchronization (5 years)."""
    five_years_ago = (datetime.now() - timedelta(days=5*365)).strftime("%Y-%m-%d")
    
    task_update_stock_list()
    task_ingest_prices(start_date=five_years_ago, desc="5-Year History")
    task_ingest_fundamentals(limit=5)
    task_rebuild_bundle()
    
    return "Backfill successful"

# ==========================================
# FLOW 2: Daily Sync (Scheduled)
# ==========================================

@flow(name="Daily Market Close Sync")
def daily_sync_flow():
    """Lightweight daily update (Yesterday's EOD)."""
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    task_update_stock_list()
    task_ingest_prices(start_date=yesterday, desc="Daily EOD")
    # We only fetch 1 year of fundamentals to check for new filings
    task_ingest_fundamentals(limit=1) 
    task_rebuild_bundle()
    
    return "Daily sync successful"

if __name__ == "__main__":
    # Standard: Daily Sync
    daily_sync_flow()
