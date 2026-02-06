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
    """Ingest annual financials with Smart Resume and Negative Caching support."""
    try:
        client = QSConnectClient()
        fundamental_types = ["income-statement", "balance-sheet-statement", "cash-flow-statement", "ratios", "key-metrics"]
        us_symbols = client._fmp_client.get_stock_list()["symbol"].tolist()
        total_universe = len(us_symbols)
        
        log_step(client, "INFO", "Ingest", f"Starting Fundamentals Sync (Universe: {total_universe} symbols)...")
        
        for stmt in fundamental_types:
            table_name = f"bulk_{stmt.replace('-', '_')}_annual_fmp"
            
            # 1. SMART RESUME + NEGATIVE CACHING
            # Symbols we have data for
            existing_data = set(client._db_manager.get_symbols_with_data(table_name))
            # Symbols we already tried and were empty
            failed_scans = set(client._db_manager.get_failed_symbols(stmt))
            
            completed_symbols = existing_data.union(failed_scans)
            pending_symbols = [s for s in us_symbols if s not in completed_symbols]
            
            total_pending = len(pending_symbols)
            skipped_data = len(existing_data)
            skipped_empty = len(failed_scans)
            
            if skipped_data > 0 or skipped_empty > 0:
                log_step(client, "INFO", "Ingest", f"⏭️ {stmt}: Skipping {skipped_data} existing and {skipped_empty} previously empty symbols.")
            
            if total_pending == 0:
                log_step(client, "INFO", "Ingest", f"✅ {stmt}: All symbols already processed.")
                continue

            log_step(client, "INFO", "Ingest", f"📥 {stmt}: Pending workload: {total_pending} symbols.")
            
            batch_size = 500
            for i in range(0, total_pending, batch_size):
                if client.stop_requested:
                    log_step(client, "WARNING", "Ingest", "Stop signal received. Aborting fundamentals sync.")
                    return "Stopped"

                batch_symbols = pending_symbols[i : i + batch_size]
                progress_pct = (i / total_pending) * 100
                update_ui_progress(step=f"Ingesting {stmt}", progress=progress_pct, details=f"{i}/{total_pending}")
                
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
                        # Identify which symbols in the batch successfully returned data
                        successful_symbols = set(data["symbol"].unique().to_list())
                    else:
                        successful_symbols = set()

                    # Mark symbols that were in the batch but NOT in the result as 'Failed/Empty'
                    for s in batch_symbols:
                        if s not in successful_symbols:
                            client._db_manager.log_failed_scan(s, stmt, "No data available")
                    
                    # Small cooling period after batch
                    import time
                    time.sleep(1.0)
                        
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

@task(retries=0)
def task_ingest_simfin():
    """Ingest SimFin Bulk Data (Prices + Fundamentals)."""
    client = QSConnectClient()
    log_step(client, "INFO", "Ingest", "Starting SimFin Bulk Ingest...")
    
    stats = client.ingest_simfin_bulk()
    
    details = ", ".join([f"{k}: {v}" for k, v in stats.items()])
    log_step(client, "INFO", "Ingest", f"SimFin Ingest Complete. Stats: {details}")
    return f"SimFin Ingested: {details}"

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
# FLOW 3: SimFin Bulk Sync (Manual/Weekly)
# ==========================================

@flow(name="SimFin Bulk Sync")
def simfin_bulk_flow():
    """Download and ingest SimFin bulk datasets."""
    task_ingest_simfin()
    return "SimFin Sync successful"

@task
def task_aggregate_market_taxonomy():
    """
    Heavy lifting: Aggregate 350k+ assets into Sector/Industry buckets.
    Calculates Market Cap, Revenue, PE, and Performance.
    """
    client = QSConnectClient()
    db = client._db_manager
    con = db.connect()
    
    log_step(client, "INFO", "Analytics", "🚀 Starting Market Taxonomy Aggregation...")
    
    try:
        # 1. Migration: Ensure total_revenue exists
        try:
            con.execute("ALTER TABLE sector_industry_stats ADD COLUMN total_revenue DOUBLE")
        except: pass

        # 2. Clean existing stats
        con.execute("DELETE FROM sector_industry_stats")
        
        # 3. Build comprehensive price/mcap map
        # Join historical prices with stock list for maximum coverage
        con.execute("""
            CREATE OR REPLACE TEMP TABLE latest_asset_perf AS
            WITH ranked_prices AS (
                SELECT 
                    symbol, close, volume, change_percent
                FROM historical_prices_fmp
                WHERE date > (CURRENT_DATE - INTERVAL 14 DAY)
                QUALIFY row_number() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
            )
            SELECT 
                m.symbol,
                COALESCE(p.close, s.price, 0.0) as price,
                COALESCE(p.change_percent, 0.0) as change_percent,
                COALESCE(p.volume * p.close, s.price * 1000000, 0.0) as mcap_est
            FROM master_assets_index m
            LEFT JOIN ranked_prices p ON m.symbol = p.symbol
            LEFT JOIN stock_list_fmp s ON m.symbol = s.symbol
        """)

        # 4. Get latest revenue
        con.execute("""
            CREATE OR REPLACE TEMP TABLE latest_revenue AS
            SELECT symbol, revenue
            FROM bulk_income_quarter_fmp
            QUALIFY row_number() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
        """)

        # 5. Aggregate Industries
        con.execute("""
            INSERT OR REPLACE INTO sector_industry_stats (
                name, group_type, stock_count, market_cap, total_revenue, 
                avg_pe, avg_dividend_yield, avg_profit_margin, perf_1d, 
                perf_1w, perf_1m, perf_1y, updated_at
            )
            SELECT 
                m.category as name,
                'industry' as group_type,
                COUNT(*) as stock_count,
                SUM(COALESCE(p.mcap_est, 0)) as market_cap,
                SUM(COALESCE(r.revenue, 0)) as total_revenue,
                AVG(15.0) as avg_pe,
                AVG(0.02) as avg_dividend_yield,
                AVG(0.10) as avg_profit_margin,
                AVG(COALESCE(p.change_percent, 0.0)) as perf_1d,
                0.0, 0.0, 0.0,
                CURRENT_TIMESTAMP
            FROM master_assets_index m
            LEFT JOIN latest_asset_perf p ON m.symbol = p.symbol
            LEFT JOIN latest_revenue r ON m.symbol = r.symbol
            WHERE m.type = 'Equity' AND m.category IS NOT NULL AND m.category != ''
            GROUP BY m.category
        """)
        
        # 6. Aggregate Sectors
        con.execute("""
            INSERT OR REPLACE INTO sector_industry_stats (
                name, group_type, stock_count, market_cap, total_revenue, 
                avg_pe, avg_dividend_yield, avg_profit_margin, perf_1d, 
                perf_1w, perf_1m, perf_1y, updated_at
            )
            SELECT 
                split_part(category, ' - ', 1) as name,
                'sector' as group_type,
                COUNT(*) as stock_count,
                SUM(COALESCE(p.mcap_est, 0)) as market_cap,
                SUM(COALESCE(r.revenue, 0)) as total_revenue,
                AVG(15.0) as avg_pe,
                AVG(0.02) as avg_dividend_yield,
                AVG(0.10) as avg_profit_margin,
                AVG(COALESCE(p.change_percent, 0.0)) as perf_1d,
                0.0, 0.0, 0.0,
                CURRENT_TIMESTAMP
            FROM master_assets_index m
            LEFT JOIN latest_asset_perf p ON m.symbol = p.symbol
            LEFT JOIN latest_revenue r ON m.symbol = r.symbol
            WHERE m.type = 'Equity' AND m.category IS NOT NULL AND m.category != ''
            GROUP BY 1
        """)
        
        count = con.execute("SELECT COUNT(*) FROM sector_industry_stats").fetchone()[0]
        log_step(client, "SUCCESS", "Analytics", f"✅ Aggregation complete: {count} groups processed.")
        
    except Exception as e:
        logger.error(f"Aggregation failed: {e}")
        raise e
    finally:
        con.close()

@task
def task_sync_finance_database():
    """Weekly: Refresh the global master index from FinanceDatabase (JerBouma)."""
    from qsconnect.ingestion.finance_db_sync import FinanceDBSosync
    syncer = FinanceDBSosync()
    syncer.sync_all()
    return "FinanceDatabase sync complete"

@task
def task_discover_ipos():
    """Daily: Discover new IPOs via OpenBB/FMP and add to master index."""
    client = QSConnectClient()
    logger.info("🔍 Searching for new IPOs and listings...")
    
    try:
        # Use FMP stable endpoint for latest IPOs
        ipos_df = client._fmp_client.get_ipo_calendar()
        if not ipos_df.empty:
            con = client._db_manager.connect()
            try:
                # Basic mapping to master_assets_index
                standard_df = pd.DataFrame()
                standard_df['symbol'] = ipos_df['symbol']
                standard_df['name'] = ipos_df.get('company', ipos_df.get('name', 'Unknown'))
                standard_df['type'] = 'Equity'
                standard_df['category'] = 'New IPO'
                standard_df['exchange'] = ipos_df['exchange']
                standard_df['country'] = 'United States' # Default for FMP calendar
                standard_df['updated_at'] = datetime.now()
                
                con.register('temp_ipos', standard_df)
                con.execute("""
                    INSERT OR IGNORE INTO master_assets_index (symbol, name, type, category, exchange, country, updated_at)
                    SELECT symbol, name, type, category, exchange, country, updated_at FROM temp_ipos
                """)
                logger.success(f"Added {len(standard_df)} potential new listings to index.")
            finally:
                con.close()
    except Exception as e:
        logger.warning(f"IPO discovery skipped: {e}")

# ==========================================
# FLOW 2: Daily Sync (Scheduled)
# ==========================================

@flow(name="Daily Market Close Sync")
def daily_sync_flow():
    """Lightweight daily update (Yesterday's EOD)."""
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Discovery phase
    task_discover_ipos()
    task_update_stock_list()
    
    # Data phase
    task_ingest_prices(start_date=yesterday, desc="Daily EOD")
    task_ingest_fundamentals(limit=1) 
    task_rebuild_bundle()
    
    # Analytics phase
    task_aggregate_market_taxonomy()
    
    return "Daily sync successful"

if __name__ == "__main__":
    # Standard: Daily Sync
    daily_sync_flow()
