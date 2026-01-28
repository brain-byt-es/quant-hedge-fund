from prefect import flow, task
from datetime import datetime, date, timedelta
from loguru import logger
from qsconnect import Client as QSConnectClient
import pandas as pd
import polars as pl

# ==========================================
# Helpers
# ==========================================

def update_ui_progress(status="running", step="", progress=0, details=""):
    """Update the shared state file for the frontend UI."""
    import json
    from config.settings import get_settings
    state_file = get_settings().duckdb_path.parent / "ingest_state.json"
    try:
        with open(state_file, "w") as f:
            json.dump({"status": status, "step": step, "progress": progress, "details": details}, f)
    except: pass

def log_step(client: QSConnectClient, level: str, component: str, message: str):
    """Log to both loguru and DB telemetry."""
    logger.log(level, f"[{component}] {message}")
    client.log_event(level, component, message)

# ==========================================
# Tasks (Internal Client Initialization)
# ==========================================

@task(retries=3, retry_delay_seconds=60)
def task_update_stock_list():
    """Update US stock list."""
    client = QSConnectClient()
    log_step(client, "INFO", "Ingest", "Starting Stock List update...")
    df = client._fmp_client.get_stock_list()
    client._db_manager.upsert_stock_list(df)
    log_step(client, "INFO", "Ingest", f"Stock List updated: {len(df)} symbols cached.")
    return f"Updated symbols"

@task(retries=2)
def task_ingest_prices(start_date: str = None, end_date: str = None, desc="Prices"):
    """Ingest prices for a specific range."""
    client = QSConnectClient()
    start_dt = date.fromisoformat(start_date) if start_date else None
    end_dt = date.fromisoformat(end_date) if end_date else None
    
    log_step(client, "INFO", "Ingest", f"Starting Price Ingestion: {desc} ({start_date} to {end_date})")
    
    def on_progress(current, total):
        update_ui_progress(step=f"Downloading Prices ({desc})", progress=(current/total)*100, details=f"{current}/{total}")

    client.bulk_historical_prices(start_date=start_dt, end_date=end_dt, progress_callback=on_progress)
    log_step(client, "INFO", "Ingest", f"Price Ingestion complete: {desc}")
    return f"{desc} sync complete"

@task(retries=0)
def task_ingest_fundamentals(limit: int = 5):
    """Ingest annual financials with Smart Resume support."""
    try:
        client = QSConnectClient()
        fundamental_types = ["income-statement", "balance-sheet-statement", "cash-flow-statement", "ratios", "key-metrics"]
        us_symbols = client._fmp_client.get_stock_list()["symbol"].tolist()
        total_universe = len(us_symbols)
        
        log_step(client, "INFO", "Ingest", f"Starting Fundamentals Sync (Universe: {total_universe} symbols)...")
        
        for stmt in fundamental_types:
            table_name = f"bulk_{stmt.replace('-', '_')}_annual_fmp"
            
            # 1. SMART RESUME: Find symbols already in DB for this statement
            existing_symbols = set(client._db_manager.get_symbols_with_data(table_name))
            pending_symbols = [s for s in us_symbols if s not in existing_symbols]
            
            total_pending = len(pending_symbols)
            skipped = total_universe - total_pending
            
            if skipped > 0:
                log_step(client, "INFO", "Ingest", f"⏭️ {stmt}: Skipping {skipped} symbols already in database.")
            
            if total_pending == 0:
                log_step(client, "INFO", "Ingest", f"✅ {stmt}: All symbols already synchronized.")
                continue

            log_step(client, "INFO", "Ingest", f"📥 {stmt}: Pending workload: {total_pending} symbols.")
            
            batch_size = 500
            for i in range(0, total_pending, batch_size):
                if client.stop_requested:
                    log_step(client, "WARNING", "Ingest", "Stop signal received. Aborting fundamentals sync.")
                    return "Stopped"

                batch_symbols = pending_symbols[i : i + batch_size]
                
                # Update UI progress based on the current stmt layer
                progress_pct = (i / total_pending) * 100
                update_ui_progress(step=f"Ingesting {stmt}", progress=progress_pct, details=f"{i}/{total_pending} (Resumed)")
                
                if (i // batch_size) % 5 == 0:
                    log_step(client, "INFO", "Ingest", f"  > {stmt}: {i}/{total_pending} pending symbols processed.")
                
                try:
                    data = client._fmp_client.get_starter_fundamentals(
                        symbols=batch_symbols,
                        statement_type=stmt,
                        limit=limit,
                        stop_check=lambda: client.stop_requested
                    )
                    
                    if isinstance(data, pd.DataFrame):
                        data = pl.from_pandas(data) if not data.empty else pl.DataFrame()
                    
                    if not data.is_empty():
                        client._db_manager.upsert_fundamentals(stmt, "annual", data)
                        
                except Exception as batch_err:
                    logger.error(f"Batch failed: {batch_err}")
                    
        log_step(client, "INFO", "Ingest", "Fundamentals Synchronization successful.")
    except Exception as e:
        logger.error(f"Fundamentals sync failed: {e}")
    return "Fundamentals sync complete"

@task
def task_rebuild_bundle():
    """Finalize data for Zipline."""
    client = QSConnectClient()
    log_step(client, "INFO", "Bundler", "Starting Zipline Bundle reconstruction...")
    client.build_zipline_bundle("historical_prices_fmp")
    client.ingest_bundle("historical_prices_fmp")
    log_step(client, "INFO", "Bundler", "Zipline Bundle ready for Research Lab.")
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
