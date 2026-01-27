"""
QS Connect - DuckDB Database Manager

High-performance columnar database management using DuckDB.
Handles all data storage, querying, and schema management.
"""

from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

import duckdb
import polars as pl
import pandas as pd
from loguru import logger


class DuckDBManager:
    """
    Manager for DuckDB database operations.
    """
    
    def __init__(self, db_path: Path, read_only: bool = False, auto_close: bool = False):
        """
        Initialize DuckDB manager.
        """
        self.db_path = Path(db_path)
        self.read_only = read_only
        self.auto_close = auto_close
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize schema on first connect (ONLY if writable)
        if not self.read_only:
            self._init_schema()
        
        logger.info(f"DuckDB manager initialized: {self.db_path} (read_only={self.read_only})")
    
    def connect(self) -> duckdb.DuckDBPyConnection:
        """Establish a NEW database connection with absolute path resolution."""
        import time
        import random
        max_retries = 15
        db_path_str = str(self.db_path.absolute().resolve())
        
        for attempt in range(max_retries):
            try:
                # Direct connection without complex config to avoid name auto-generation conflicts
                conn = duckdb.connect(
                    database=db_path_str, 
                    read_only=self.read_only
                )
                # Set performance pragmas immediately
                conn.execute("PRAGMA threads=1")
                return conn
            except Exception as e:
                err_msg = str(e).lower()
                if ("used by another process" in err_msg or "cannot open" in err_msg or "unique file handle" in err_msg) and attempt < max_retries - 1:
                    wait_time = (0.1 * (2 ** attempt)) + (random.random() * 0.1)
                    time.sleep(wait_time)
                else:
                    logger.error(f"Failed to connect to DuckDB: {e}")
                    raise e
        
        raise ConnectionError("Failed to initialize DuckDB connection.")
    
    def close(self) -> None:
        """Deprecated: connections are now short-lived and self-closing."""
        pass
    
    def _init_schema(self) -> None:
        """Initialize institutional database schema (13 core tables + Governance)."""
        conn = self.connect()
        try:
            # 1. Historical Prices
            conn.execute("""
                CREATE TABLE IF NOT EXISTS historical_prices_fmp (
                    symbol VARCHAR,
                    date DATE,
                    open DOUBLE,
                    high DOUBLE,
                    low DOUBLE,
                    close DOUBLE,
                    adj_close DOUBLE,
                    volume DOUBLE,
                    change DOUBLE,
                    change_percent DOUBLE,
                    vwap DOUBLE,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (symbol, date)
                )
            """)
            
            # 2. Stock List
            conn.execute("""
                CREATE TABLE IF NOT EXISTS stock_list_fmp (
                    symbol VARCHAR PRIMARY KEY,
                    name VARCHAR,
                    exchange VARCHAR,
                    exchange_short_name VARCHAR,
                    asset_type VARCHAR,
                    price DOUBLE,
                    sector VARCHAR,
                    industry VARCHAR,
                    country VARCHAR,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 3-12. Bulk Financials (Annual & Quarter) placeholders
            financial_tables = [
                "bulk_income_statement_annual_fmp", "bulk_income_statement_quarter_fmp",
                "bulk_balance_sheet_statement_annual_fmp", "bulk_balance_sheet_statement_quarter_fmp",
                "bulk_cash_flow_statement_annual_fmp", "bulk_cash_flow_statement_quarter_fmp",
                "bulk_ratios_annual_fmp", "bulk_ratios_quarter_fmp",
                "bulk_key_metrics_annual_fmp", "bulk_key_metrics_quarter_fmp"
            ]
            for table in financial_tables:
                conn.execute(f"CREATE TABLE IF NOT EXISTS {table} (symbol VARCHAR, date DATE, period VARCHAR, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")

            # 13. Company Profiles
            conn.execute("""
                CREATE TABLE IF NOT EXISTS bulk_company_profiles_fmp (
                    symbol VARCHAR PRIMARY KEY,
                    company_name VARCHAR,
                    sector VARCHAR,
                    industry VARCHAR,
                    description TEXT,
                    website VARCHAR,
                    ceo VARCHAR,
                    full_time_employees BIGINT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 14. Strategy Audit Log (Change Governance)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS strategy_audit_log (
                    strategy_hash VARCHAR PRIMARY KEY,
                    config_json JSON,
                    regime_snapshot JSON,
                    llm_reasoning TEXT,
                    human_rationale TEXT,
                    approved_by VARCHAR,
                    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    stage VARCHAR, -- SHADOW, PAPER, CANARY, FULL
                    capital_allocation DOUBLE DEFAULT 0.0,
                    mlflow_run_id VARCHAR,
                    ttl_expiry TIMESTAMP
                )
            """)
            
            # 15. Strategy Drift Logs (Performance Tracking)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS strategy_drift_logs (
                    strategy_hash VARCHAR,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metric_name VARCHAR,
                    expected_value DOUBLE,
                    actual_value DOUBLE,
                    drift_score DOUBLE,
                    status VARCHAR, -- GREEN, YELLOW, RED
                    PRIMARY KEY (strategy_hash, timestamp, metric_name)
                )
            """)

            # 16. Trade Execution Log
            conn.execute("""
                CREATE TABLE IF NOT EXISTS trades (
                    trade_id VARCHAR PRIMARY KEY,
                    strategy_hash VARCHAR,
                    symbol VARCHAR,
                    side VARCHAR,
                    quantity DOUBLE,
                    fill_price DOUBLE,
                    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    commission DOUBLE,
                    slippage_bps DOUBLE,
                    order_type VARCHAR,
                    account_id VARCHAR
                )
            """)

            # 17. Real-Time Candle Truth Layer
            conn.execute("""
                CREATE TABLE IF NOT EXISTS realtime_candles (
                    symbol VARCHAR,
                    timestamp TIMESTAMP,
                    open DOUBLE,
                    high DOUBLE,
                    low DOUBLE,
                    close DOUBLE,
                    volume DOUBLE,
                    is_final BOOLEAN,
                    source VARCHAR,
                    asset_class VARCHAR,
                    PRIMARY KEY (symbol, timestamp)
                )
            """)

            # 18. Point-in-Time Index Constituents
            conn.execute("""
                CREATE TABLE IF NOT EXISTS index_constituents (
                    index_symbol VARCHAR,
                    date DATE,
                    symbol VARCHAR,
                    weight DOUBLE,
                    added_date DATE,
                    removed_date DATE,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (index_symbol, date, symbol)
                )
            """)
            
            # 19. System Logs (Headless execution tracking)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS system_logs (
                    id UUID DEFAULT uuid(),
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    level VARCHAR,
                    component VARCHAR,
                    message TEXT,
                    details JSON
                )
            """)

            # 20. Alternative Data: Insider Trades
            conn.execute("""
                CREATE TABLE IF NOT EXISTS insider_trades (
                    symbol VARCHAR,
                    transaction_date DATE,
                    reporting_name VARCHAR,
                    type_of_owner VARCHAR,
                    transaction_type VARCHAR,
                    securities_transacted DOUBLE,
                    price DOUBLE,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 21. Alternative Data: Senate Trades
            conn.execute("""
                CREATE TABLE IF NOT EXISTS senate_trades (
                    symbol VARCHAR,
                    transaction_date DATE,
                    representative VARCHAR,
                    house VARCHAR, -- Senate or House
                    type VARCHAR, -- Purchase or Sale
                    amount VARCHAR,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 22. Ownership: Institutional & ETF
            conn.execute("""
                CREATE TABLE IF NOT EXISTS institutional_ownership (
                    symbol VARCHAR,
                    date DATE,
                    investor_name VARCHAR,
                    change DOUBLE,
                    change_percent DOUBLE,
                    total_shares DOUBLE,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 23. Macro: Economic Indicators
            conn.execute("""
                CREATE TABLE IF NOT EXISTS economic_indicators (
                    name VARCHAR,
                    date DATE,
                    value DOUBLE,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (name, date)
                )
            """)

            # 24. AI: News Sentiment
            conn.execute("""
                CREATE TABLE IF NOT EXISTS news_sentiment (
                    symbol VARCHAR,
                    published_date TIMESTAMP,
                    title TEXT,
                    sentiment_score DOUBLE,
                    sentiment_label VARCHAR,
                    url TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            conn.execute("CREATE INDEX IF NOT EXISTS idx_hp_sym ON historical_prices_fmp(symbol)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_hp_date ON historical_prices_fmp(date)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_logs_ts ON system_logs(timestamp)")
            
            logger.info("Institutional database schema initialized successfully")
        finally:
            conn.close()

    # =====================
    # Persistence Methods
    # =====================

    def upsert_prices(self, df: pl.DataFrame) -> int:
        """Upsert price data into historical_prices_fmp with strict type enforcement."""
        if df.is_empty(): return 0
        conn = self.connect()
        try:
            # Standardize column names
            column_mapping = {"adjClose": "adj_close", "changePercent": "change_percent"}
            for old, new in column_mapping.items():
                if old in df.columns: df = df.rename({old: new})
            
            # FORCE all numeric columns to Float64 (DOUBLE) to prevent overflow errors
            numeric_cols = ["volume", "open", "high", "low", "close", "adj_close", "change", "change_percent", "vwap"]
            for col in numeric_cols:
                if col in df.columns:
                    # Cast to float64 which maps directly to DuckDB DOUBLE
                    df = df.with_columns(pl.col(col).cast(pl.Float64))
            
            # Ensure we only select what exists and is needed
            target_cols = ["symbol", "date", "open", "high", "low", "close", "volume"]
            available_cols = [c for c in target_cols if c in df.columns]
            df_subset = df.select(available_cols)
            
            conn.register("temp_prices", df_subset)
            conn.execute("""
                INSERT OR REPLACE INTO historical_prices_fmp (symbol, date, open, high, low, close, volume)
                SELECT symbol, date, open, high, low, close, volume FROM temp_prices
            """)
            return len(df)
        finally:
            try: conn.unregister("temp_prices")
            except: pass
            conn.close()

    def upsert_fundamentals(self, statement_type: str, period: str, df: pl.DataFrame) -> int:
        """Upsert fundamental data into the specific bulk table."""
        if df.is_empty(): return 0
        table_name = f"bulk_{statement_type.replace('-', '_')}_{period}_fmp"
        conn = self.connect()
        try:
            conn.register("temp_fund", df)
            conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM temp_fund")
            return len(df)
        finally:
            conn.unregister("temp_fund")
            conn.close()

    def upsert_stock_list(self, df: pd.DataFrame) -> int:
        """Upsert stock list data using persistent schema."""
        if df.empty: return 0
        conn = self.connect()
        try:
            # Standardize column mapping to match FMP 'stable' keys to our schema
            mapping = {
                "exchangeShortName": "exchange_short_name",
                "type": "asset_type",
                "companyName": "name"
            }
            df = df.rename(columns=mapping)
            
            # Ensure ALL required columns exist
            required_cols = ["symbol", "name", "exchange", "exchange_short_name", "asset_type", "price"]
            for col in required_cols:
                if col not in df.columns:
                    # Fallback logic
                    if col == "exchange" and "exchange_short_name" in df.columns:
                        df[col] = df["exchange_short_name"]
                    else:
                        df[col] = None # Default to NULL for missing columns
            
            # Add updated_at timestamp from Python to avoid SQL binder errors
            df["updated_at"] = datetime.now()

            conn.register("temp_stocks", df)
            
            # Self-healing: Ensure unique constraint exists for ON CONFLICT
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_sl_pk ON stock_list_fmp(symbol)")
            
            # Use explicit Upsert with ON CONFLICT for robustness
            conn.execute("""
                INSERT INTO stock_list_fmp (
                    symbol, name, exchange, exchange_short_name, asset_type, price, updated_at
                )
                SELECT symbol, name, exchange, exchange_short_name, asset_type, price, updated_at FROM temp_stocks
                ON CONFLICT (symbol) DO UPDATE SET
                    name = EXCLUDED.name,
                    exchange = EXCLUDED.exchange,
                    exchange_short_name = EXCLUDED.exchange_short_name,
                    asset_type = EXCLUDED.asset_type,
                    price = EXCLUDED.price,
                    updated_at = EXCLUDED.updated_at
            """)
            return len(df)
        finally:
            try: conn.unregister("temp_stocks")
            except: pass
            conn.close()

    def upsert_company_profiles(self, df: pd.DataFrame) -> int:
        """Upsert company profile data using persistent schema."""
        if df.empty: return 0
        conn = self.connect()
        try:
            # Add updated_at timestamp
            df["updated_at"] = datetime.now()
            
            conn.register("temp_profiles", df)
            
            # Self-healing: Ensure unique constraint exists for ON CONFLICT
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_cp_pk ON bulk_company_profiles_fmp(symbol)")
            
            conn.execute("""
                INSERT INTO bulk_company_profiles_fmp (
                    symbol, company_name, sector, industry, description, website, ceo, full_time_employees, updated_at
                )
                SELECT symbol, companyName, sector, industry, description, website, ceo, fullTimeEmployees, updated_at FROM temp_profiles
                ON CONFLICT (symbol) DO UPDATE SET
                    company_name = EXCLUDED.company_name,
                    sector = EXCLUDED.sector,
                    industry = EXCLUDED.industry,
                    description = EXCLUDED.description,
                    website = EXCLUDED.website,
                    ceo = EXCLUDED.ceo,
                    full_time_employees = EXCLUDED.full_time_employees,
                    updated_at = EXCLUDED.updated_at
            """)
            return len(df)
        finally:
            try: conn.unregister("temp_profiles")
            except: pass
            conn.close()

    # =====================
    # Operational Methods
    # =====================

    def log_event(self, level: str, component: str, message: str, details: Optional[Dict] = None) -> None:
        """Log a system event to the database."""
        conn = self.connect()
        try:
            import json
            details_json = json.dumps(details) if details else None
            conn.execute("INSERT INTO system_logs (level, component, message, details) VALUES (?, ?, ?, ?)", [level, component, message, details_json])
        except Exception as e:
            logger.error(f"Failed to write to system_logs: {e}")
        finally:
            conn.close()

    def get_logs(self, limit: int = 100) -> pl.DataFrame:
        """Get recent system logs."""
        return self.query(f"SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT {limit}")

    def get_prices(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> pl.DataFrame:
        """
        Get historical prices for all symbols within a date range.
        Used by ZiplineBundler.
        """
        query = "SELECT symbol, date, open, high, low, close, volume FROM historical_prices_fmp"
        conditions = []
        
        if start_date:
            conditions.append(f"date >= '{start_date}'")
        if end_date:
            conditions.append(f"date <= '{end_date}'")
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
            
        query += " ORDER BY symbol, date"
        
        return self.query(query)

    def get_data_health(self) -> pl.DataFrame:
        """Get health statistics for all symbols."""
        sql = """
            SELECT 
                symbol,
                MIN(date) as first_date,
                MAX(date) as last_date,
                COUNT(*) as count,
                MAX(date) < (CURRENT_DATE - INTERVAL 3 DAY) as is_stale
            FROM historical_prices_fmp
            GROUP BY symbol
            ORDER BY last_date ASC, symbol
        """
        return self.query(sql)

    def get_table_stats(self) -> List[Dict[str, Any]]:
        """Get row counts for key tables."""
        tables = [
            "stock_list_fmp",
            "historical_prices_fmp",
            "bulk_income_statement_annual_fmp",
            "bulk_balance_sheet_statement_annual_fmp",
            "bulk_cash_flow_statement_annual_fmp",
            "bulk_ratios_annual_fmp",
            "bulk_key_metrics_annual_fmp",
            "strategy_audit_log",
            "trades"
        ]
        
        stats = []
        for table in tables:
            try:
                # Check if table exists first
                exists = self.query(f"SELECT count(*) FROM information_schema.tables WHERE table_name = '{table}'")[0,0] > 0
                if exists:
                    count = self.query(f"SELECT COUNT(*) FROM {table}")[0,0]
                    stats.append({"name": table, "count": count, "status": "active"})
                else:
                    stats.append({"name": table, "count": 0, "status": "missing"})
            except Exception:
                stats.append({"name": table, "count": -1, "status": "error"})
        
        return stats

    # =====================
    # Query Core
    # =====================
    
    def query(self, sql: str) -> pl.DataFrame:
        """Execute a SQL query and return results as Polars DataFrame."""
        conn = self.connect()
        try:
            return conn.execute(sql).pl()
        finally:
            conn.close()
    
    def query_pandas(self, sql: str) -> pd.DataFrame:
        """Execute a SQL query and return results as Pandas DataFrame."""
        conn = self.connect()
        try:
            return conn.execute(sql).df()
        finally:
            conn.close()

    def execute(self, sql: str, params: Optional[Any] = None) -> None:
        """Execute a SQL command."""
        conn = self.connect()
        try:
            if params: conn.execute(sql, params)
            else: conn.execute(sql)
        finally:
            conn.close()

    def get_symbols(self) -> List[str]:
        """Get list of all symbols in the database."""
        result = self.query("SELECT DISTINCT symbol FROM historical_prices_fmp ORDER BY symbol")
        return result["symbol"].to_list() if not result.is_empty() else []
    
    def get_date_range(self) -> Dict[str, Any]:
        """Get the date range of price data in the database."""
        result = self.query_pandas("SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(DISTINCT symbol) as num_symbols, COUNT(*) as num_records FROM historical_prices_fmp")
        if not result.empty:
            return {
                "min_date": str(result["min_date"].iloc[0]),
                "max_date": str(result["max_date"].iloc[0]),
                "num_symbols": int(result["num_symbols"].iloc[0]),
                "num_records": int(result["num_records"].iloc[0]),
            }
        return {"min_date": None, "max_date": None, "num_symbols": 0, "num_records": 0}
