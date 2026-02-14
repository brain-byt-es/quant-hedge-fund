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
# Tasks
# ==========================================

@task(retries=3, retry_delay_seconds=60)
def task_update_stock_list():
    """Update metadata (Sectors, Industries) for the Active Universe."""
    client = QSConnectClient()
    log_step(client, "INFO", "Ingest", "Refreshing Active Universe metadata (Sectors/Industries)...")
    
    # Get the SimFin anchor
    active_symbols = set(client.get_active_universe())
    
    # Fetch detailed list from FMP Screener (includes Sectors/Industries)
    url = "https://financialmodelingprep.com/stable/company-screener?limit=10000"
    data = client._fmp_client._make_request(url)
    
    if data:
        df_full = pd.DataFrame(data)
        df_active = df_full[df_full["symbol"].isin(active_symbols)]
        client._db_manager.upsert_stock_list(df_active)
        log_step(client, "INFO", "Ingest", f"Active metadata enriched for {len(df_active)} symbols.")
        return f"Enriched {len(df_active)} symbols"
    
    return "Metadata refresh failed"

@task(retries=2)
def task_enrich_ciks():
    """Fetch CIKs by querying Company Profiles individually."""
    import concurrent.futures
    client = QSConnectClient()
    log_step(client, "INFO", "Ingest", "Enriching CIK identifiers via Parallel Stable Profiles...")
    
    try:
        con = client._db_manager.connect()
        missing_df = con.execute("SELECT symbol FROM stock_list_fmp WHERE cik IS NULL OR cik = ''").pl()
        con.close()
        
        pending_symbols = missing_df["symbol"].to_list()
        total = len(pending_symbols)
        
        if total == 0:
            log_step(client, "SUCCESS", "Ingest", "✅ All symbols already have CIKs.")
            return "No work needed"

        log_step(client, "INFO", "Ingest", f"Fetching CIK DNA for {total} symbols...")
        
        updated_count = 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            def _fetch_cik(symbol):
                url = f"https://financialmodelingprep.com/stable/profile?symbol={symbol}"
                try:
                    data = client._fmp_client._make_request(url)
                    if data and len(data) > 0:
                        profile = data[0]
                        cik = profile.get("cik") or profile.get("CIK")
                        return symbol, cik
                except: pass
                return symbol, None

            future_to_symbol = {executor.submit(_fetch_cik, s): s for s in pending_symbols}
            
            batch_updates = []
            for future in concurrent.futures.as_completed(future_to_symbol):
                if client.stop_requested: break
                
                symbol, cik = future.result()
                if cik:
                    batch_updates.append((cik, symbol))
                    
                if len(batch_updates) >= 100:
                    con = client._db_manager.connect()
                    try:
                        for cik_val, sym_val in batch_updates:
                            con.execute("UPDATE stock_list_fmp SET cik = ? WHERE symbol = ?", [cik_val, sym_val])
                        updated_count += len(batch_updates)
                        batch_updates = []
                    finally:
                        con.close()

            if batch_updates:
                con = client._db_manager.connect()
                for cik_val, sym_val in batch_updates:
                    con.execute("UPDATE stock_list_fmp SET cik = ? WHERE symbol = ?", [cik_val, sym_val])
                updated_count += len(batch_updates)
                con.close()
                
        log_step(client, "SUCCESS", "Ingest", f"✅ CIK Enrichment complete. Updated {updated_count} symbols.")
        
    except Exception as e:
        logger.error(f"CIK enrichment failed: {e}")

@task(retries=2)
def task_ingest_prices(start_date: str = None, end_date: str = None, desc="Prices"):
    """Ingest prices for the Active Universe (SimFin Anchor)."""
    client = QSConnectClient()
    start_dt = date.fromisoformat(start_date) if start_date else None
    end_dt = date.fromisoformat(end_date) if end_date else None
    
    active_symbols = client.get_active_universe()
    log_step(client, "INFO", "Ingest", f"Starting Price Ingestion: {desc} for {len(active_symbols)} symbols.")
    
    def on_progress(current, total):
        update_ui_progress(step=f"Downloading Prices ({desc})", progress=(current/total)*100, details=f"{current}/{total}")

    client.bulk_historical_prices(
        start_date=start_dt, 
        end_date=end_dt, 
        symbols=active_symbols,
        progress_callback=on_progress
    )
    log_step(client, "INFO", "Ingest", f"Price Ingestion complete: {desc}")
    return f"{desc} sync complete"

@task(retries=0)
def task_ingest_fundamentals(limit: int = 5):
    """Ingest annual financials for the Active Universe."""
    try:
        client = QSConnectClient()
        fundamental_types = ["income-statement", "balance-sheet-statement", "cash-flow-statement", "ratios", "key-metrics"]
        
        active_symbols = client.get_active_universe()
        total_universe = len(active_symbols)
        
        log_step(client, "INFO", "Ingest", f"Starting Fundamentals Sync (Universe: {total_universe} symbols)...")
        
        for stmt in fundamental_types:
            table_name = f"bulk_{stmt.replace('-', '_')}_annual_fmp"
            clean_name = stmt.split('-')[0]
            if clean_name == "cash": clean_name = "cashflow"
            if clean_name == "key": clean_name = "key_metrics"
            simfin_table = f"bulk_{clean_name}_quarter_fmp"
            
            existing_fmp = set(client._db_manager.get_symbols_with_data(table_name))
            existing_simfin = set(client._db_manager.get_symbols_with_data(simfin_table))
            failed_scans = set(client._db_manager.get_failed_symbols(stmt))
            
            completed_symbols = existing_fmp.union(existing_simfin).union(failed_scans)
            pending_symbols = [s for s in active_symbols if s not in completed_symbols]
            
            total_pending = len(pending_symbols)
            if total_pending == 0:
                log_step(client, "INFO", "Ingest", f"✅ {stmt}: All symbols already covered by SimFin or FMP.")
                continue

            log_step(client, "INFO", "Ingest", f"📥 {stmt}: Pending workload: {total_pending} symbols needing FMP enrichment.")
            
            batch_size = 200
            for i in range(0, total_pending, batch_size):
                if client.stop_requested: return "Stopped"

                batch_symbols = pending_symbols[i : i + batch_size]
                update_ui_progress(step=f"Ingesting {stmt}", progress=(i / total_pending) * 100, details=f"{i}/{total_pending}")
                
                try:
                    data = client._fmp_client.get_starter_fundamentals(
                        symbols=batch_symbols,
                        statement_type=stmt,
                        limit=limit,
                        stop_check=lambda: client.stop_requested
                    )
                    
                    if isinstance(data, pd.DataFrame) and not data.empty:
                        for col in data.select_dtypes(include=['number']).columns:
                            data[col] = data[col].astype(float)
                        client._db_manager.upsert_fundamentals(stmt, "annual", pl.from_pandas(data))
                        successful_symbols = set(data["symbol"].unique().to_list())
                    else:
                        successful_symbols = set()

                    for s in batch_symbols:
                        if s not in successful_symbols:
                            client._db_manager.log_failed_scan(s, stmt, "No data available")
                    
                    import time
                    time.sleep(0.5)
                except Exception as batch_err:
                    logger.error(f"Batch failed: {batch_err}")
                    
        log_step(client, "INFO", "Ingest", "Fundamentals Synchronization successful.")
    except Exception as e:
        logger.error(f"Fundamentals sync failed: {e}")
    return "Fundamentals sync complete"

@task(retries=0)
def task_stitch_tickers():
    """Identify and merge duplicate symbols sharing the same CIK."""
    client = QSConnectClient()
    db = client._db_manager
    con = db.connect()
    
    log_step(client, "INFO", "Stitcher", "🔍 Starting Ticker Stitching (CIK Merge)...")
    
    try:
        duplicates = con.execute("""
            SELECT cik, list(symbol) as symbols, count(*) as count
            FROM stock_list_fmp 
            WHERE cik IS NOT NULL AND cik != '' AND cik != 'None'
            GROUP BY cik 
            HAVING count(distinct symbol) > 1
        """).pl()
        
        if duplicates.is_empty():
            log_step(client, "INFO", "Stitcher", "✅ No ticker mismatches found.")
            return "No duplicates"

        merged_count = 0
        for row in duplicates.to_dicts():
            symbols = row['symbols']
            cik = row['cik']
            
            dates_query = f"SELECT symbol, MAX(date) as last_date FROM historical_prices_fmp WHERE symbol IN ({','.join(['?' for _ in symbols])}) GROUP BY symbol"
            dates_df = con.execute(dates_query, symbols).pl()
            
            if dates_df.is_empty(): continue
            
            master_symbol = dates_df.sort("last_date", descending=True)["symbol"][0]
            master_last_date = dates_df.sort("last_date", descending=True)["last_date"][0]
            aliases = [s for s in symbols if s != master_symbol]
            
            for source in aliases:
                source_info = dates_df.filter(pl.col("symbol") == source)
                if not source_info.is_empty():
                    source_last_date = source_info["last_date"][0]
                    days_stale = (master_last_date - source_last_date).days
                    if days_stale < 90: continue

                log_step(client, "INFO", "Stitcher", f"🧵 Stitching {source} -> {master_symbol} (CIK: {cik})")
                
                con.execute("""
                    INSERT OR IGNORE INTO ticker_aliases (source_symbol, master_symbol, cik, reason)
                    VALUES (?, ?, ?, 'CIK Match')
                """, [source, master_symbol, cik])
                
                con.execute(f"""
                    INSERT OR IGNORE INTO historical_prices_fmp (symbol, date, open, high, low, close, volume, updated_at)
                    SELECT '{master_symbol}', date, open, high, low, close, volume, updated_at 
                    FROM historical_prices_fmp 
                    WHERE symbol = ?
                """, [source])
                
                con.execute("DELETE FROM historical_prices_fmp WHERE symbol = ?", [source])
                con.execute("DELETE FROM stock_list_fmp WHERE symbol = ?", [source])
                merged_count += 1
        
        log_step(client, "SUCCESS", "Stitcher", f"✅ Successfully stitched {merged_count} ticker pairs.")
        return f"Merged {merged_count} symbols"
    finally:
        con.close()

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
    log_step(client, "INFO", "Ingest", f"SimFin Ingest Complete. Stats: {stats}")
    return f"SimFin Ingested: {stats}"

@task
def task_aggregate_market_taxonomy():
    """Aggregates assets into buckets using proven pure-SQL logic with NaN protection."""
    client = QSConnectClient()
    db = client._db_manager
    con = db.connect()
    
    log_step(client, "INFO", "Analytics", "🚀 Starting Market Taxonomy Aggregation...")
    
    try:
        # 1. Performance Table - Filter out NaNs immediately
        con.execute("DROP TABLE IF EXISTS asset_perf_working")
        con.execute("""
            CREATE TABLE asset_perf_working AS
            WITH p AS (
                SELECT symbol, date, close,
                       row_number() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM (SELECT symbol, date, AVG(close) as close FROM historical_prices_fmp GROUP BY 1, 2)
            ),
            p0 AS (SELECT symbol, close FROM p WHERE rn = 1),
            p1 AS (SELECT symbol, close FROM p WHERE rn = 2),
            py AS (
                SELECT symbol, close FROM historical_prices_fmp
                WHERE date <= (CURRENT_DATE - INTERVAL 360 DAY)
                QUALIFY row_number() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
            ),
            raw_perf AS (
                SELECT 
                    trim(p0.symbol) as symbol,
                    CAST(((p0.close / NULLIF(p1.close, 0)) - 1.0) * 100.0 AS DOUBLE) as r1d,
                    CAST(((p0.close / NULLIF(py.close, 0)) - 1.0) * 100.0 AS DOUBLE) as r1y
                FROM p0
                LEFT JOIN p1 ON p0.symbol = p1.symbol
                LEFT JOIN py ON p0.symbol = py.symbol
            )
            SELECT symbol, 
                   CASE WHEN isfinite(r1d) THEN r1d ELSE NULL END as ret_1d,
                   CASE WHEN isfinite(r1y) THEN r1y ELSE NULL END as ret_1y
            FROM raw_perf
            WHERE isfinite(r1d) OR isfinite(r1y)
        """)

        # 2. Stats Table
        con.execute("DROP TABLE IF EXISTS sector_industry_stats")
        con.execute("""
            CREATE TABLE sector_industry_stats (
                name VARCHAR, group_type VARCHAR, stock_count INTEGER,
                market_cap DOUBLE, total_revenue DOUBLE, avg_pe DOUBLE,
                avg_dividend_yield DOUBLE, avg_profit_margin DOUBLE,
                perf_1d DOUBLE, perf_1w DOUBLE, perf_1m DOUBLE, perf_1y DOUBLE,
                updated_at TIMESTAMP
            )
        """)

        # 3. Perform the Aggregation (using trim(symbol) to ensure join integrity)
        for col, gtype in [('industry', 'industry'), ('sector', 'sector')]:
            sql = f"""
                INSERT INTO sector_industry_stats
                SELECT 
                    s.{col} as name,
                    '{gtype}' as group_type,
                    count(*) as stock_count,
                    CAST(SUM(COALESCE(m.market_cap, s.price * 1000000, 0)) AS DOUBLE) as market_cap,
                    CAST(SUM(COALESCE(i.revenue, 0)) AS DOUBLE) as total_revenue,
                    CAST(MEDIAN(NULLIF(r.priceToEarningsRatio, 0)) AS DOUBLE) as avg_pe,
                    CAST(AVG(NULLIF(r.dividendYield, 0)) AS DOUBLE) as avg_dividend_yield,
                    CAST(AVG(NULLIF(r.netProfitMargin, 0)) AS DOUBLE) as avg_profit_margin,
                    CAST(COALESCE(AVG(p.ret_1d), 0.0) AS DOUBLE) as perf_1d,
                    0.0 as perf_1w, 0.0 as perf_1m,
                    CAST(COALESCE(AVG(p.ret_1y), 0.0) AS DOUBLE) as perf_1y,
                    CURRENT_TIMESTAMP as updated_at
                FROM stock_list_fmp s
                LEFT JOIN factor_ranks_snapshot m ON s.symbol = m.symbol
                LEFT JOIN asset_perf_working p ON trim(s.symbol) = trim(p.symbol)
                LEFT JOIN (
                    SELECT symbol, revenue FROM bulk_income_quarter_fmp 
                    QUALIFY row_number() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
                ) i ON s.symbol = i.symbol
                LEFT JOIN (
                    SELECT symbol, priceToEarningsRatio, dividendYield, netProfitMargin FROM bulk_ratios_annual_fmp 
                    QUALIFY row_number() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
                ) r ON s.symbol = r.symbol
                WHERE s.{col} IS NOT NULL AND s.{col} != ''
                GROUP BY 1
            """
            con.execute(sql)

        count = con.execute("SELECT COUNT(*) FROM sector_industry_stats").fetchone()[0]
        log_step(client, "SUCCESS", "Analytics", f"✅ Aggregation complete: {count} groups processed.")
    except Exception as e:
        logger.error(f"Aggregation failed: {e}")
        raise e
    finally:
        con.execute("DROP TABLE IF EXISTS asset_perf_working")
        con.close()

@task
def task_sync_finance_database():
    """Weekly: Refresh the global master index from FinanceDatabase."""
    from qsconnect.ingestion.finance_db_sync import FinanceDBSosync
    syncer = FinanceDBSosync()
    syncer.sync_all()
    return "FinanceDatabase sync complete"

@task
def task_discover_ipos():
    """Daily: Discover new IPOs via OpenBB/FMP and add to master index."""
    client = QSConnectClient()
    try:
        ipos_df = client._fmp_client.get_ipo_calendar()
        if not ipos_df.empty:
            con = client._db_manager.connect()
            try:
                standard_df = pd.DataFrame()
                standard_df['symbol'] = ipos_df['symbol']
                standard_df['name'] = ipos_df.get('company', ipos_df.get('name', 'Unknown'))
                standard_df['type'] = 'Equity'; standard_df['category'] = 'New IPO'
                standard_df['exchange'] = ipos_df['exchange']; standard_df['country'] = 'United States'
                standard_df['updated_at'] = datetime.now()
                con.register('temp_ipos', standard_df)
                con.execute("INSERT OR IGNORE INTO master_assets_index SELECT * FROM temp_ipos")
            finally: con.close()
    except Exception as e: logger.warning(f"IPO discovery skipped: {e}")

# ==========================================
# Flows
# ==========================================

@flow(name="Hedge Fund Backfill (2-Year)")
def historical_backfill_flow():
    two_years_ago = (datetime.now() - timedelta(days=2*365)).strftime("%Y-%m-%d")
    task_update_stock_list()
    task_ingest_prices(start_date=two_years_ago, desc="2-Year History")
    task_ingest_fundamentals(limit=5)
    task_stitch_tickers()
    task_rebuild_bundle()
    return "Backfill successful"

@flow(name="SimFin Bulk Sync")
def simfin_bulk_flow():
    task_ingest_simfin()
    task_stitch_tickers()
    return "SimFin Sync successful"

@flow(name="Daily Market Close Sync")
def daily_sync_flow():
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    task_discover_ipos()
    task_update_stock_list()
    task_enrich_ciks()
    task_ingest_prices(start_date=yesterday, desc="Daily EOD")
    task_ingest_fundamentals(limit=1) 
    task_stitch_tickers()
    task_rebuild_bundle()
    task_aggregate_market_taxonomy()
    return "Daily sync successful"

if __name__ == "__main__":
    daily_sync_flow()
