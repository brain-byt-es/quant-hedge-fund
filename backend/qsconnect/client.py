"""
QS Connect - Main Client

The Client class is the primary interface for all data operations.
It provides methods to download, cache, and manage market and fundamental data.
"""

from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
import polars as pl
from loguru import logger

from config.constants import (
    Exchange,
)
from config.settings import get_settings
from qsconnect.api.fmp_client import FMPClient
from qsconnect.api.simfin_client import SimFinClient
from qsconnect.bundle.zipline_bundler import ZiplineBundler
from qsconnect.cache.cache_manager import CacheManager
from qsconnect.database.duckdb_manager import DuckDBManager
from qsconnect.database.remote_writer import RemoteWriter


class Client:
    """
    Main QS Connect client for data operations.
    Supports Writer-Reader Split architecture via Data Service.
    """

    def __init__(
        self,
        fmp_api_key: Optional[str] = None,
        simfin_api_key: Optional[str] = None,
        datalink_api_key: Optional[str] = None,
        duckdb_path: Optional[Path] = None,
        cache_dir: Optional[Path] = None,
        read_only: bool = True, # Default to RO for API safety
    ):
        """
        Initialize the QS Connect client.
        """
        settings = get_settings()

        # API Keys
        self._fmp_api_key = fmp_api_key or settings.fmp_api_key
        self._simfin_api_key = simfin_api_key or settings.simfin_api_key
        self._datalink_api_key = datalink_api_key or settings.datalink_api_key

        # Paths
        self._duckdb_path = duckdb_path or settings.duckdb_path
        self._cache_dir = cache_dir or settings.cache_dir

        # Validate API keys
        if not self._fmp_api_key or "your_fmp_api_key" in self._fmp_api_key:
            logger.critical("FMP API key is missing or set to default! Data ingestion will FAIL. Update .env with a valid key.")

        # Initialize sub-clients
        self._fmp_client = FMPClient(api_key=self._fmp_api_key)

        # Ensure SimFin uses the central data directory
        simfin_dir = self._duckdb_path.parent / "simfin"
        simfin_dir.mkdir(parents=True, exist_ok=True)
        self._simfin_client = SimFinClient(api_key=self._simfin_api_key, data_dir=str(simfin_dir))

        self._db_manager = DuckDBManager(db_path=self._duckdb_path, read_only=read_only)
        self._cache_manager = CacheManager(cache_dir=self._cache_dir)
        self._bundler = ZiplineBundler(db_manager=self._db_manager)
        
        # Remote Writer for Split Architecture
        self._writer = RemoteWriter()

        # Stop Signal for background tasks
        self._stop_requested = False

        logger.info(f"QS Connect client initialized. Cache: {self._cache_dir} (Read-Only: {read_only})")

    @property
    def stop_requested(self) -> bool:
        """Check if stop is requested via flag or file."""
        if self._stop_requested:
            return True

        # Check for global signal file (for multi-process support)
        # We use duckdb_path parent which is guaranteed to be the data directory
        signal_file = self._duckdb_path.parent / "ingest_stop.signal"
        return signal_file.exists()

    @stop_requested.setter
    def stop_requested(self, value: bool):
        self._stop_requested = value
        # Also create/remove file to broadcast to other processes
        signal_file = self._duckdb_path.parent / "ingest_stop.signal"
        if value:
            try:
                signal_file.touch()
                logger.warning(f"🛑 Stop signal file created at {signal_file}")
            except Exception as e:
                logger.error(f"Failed to create stop signal: {e}")
        else:
            try:
                if signal_file.exists():
                    signal_file.unlink()
                    logger.info("🟢 Stop signal file cleared.")
            except Exception as e:
                logger.error(f"Failed to clear stop signal: {e}")

    # =====================
    # Stock Universe
    # =====================

    def get_active_universe(self) -> List[str]:
        """
        Determine the 'Active Universe' for deep ingestion (Prices/Fundamentals).
        Strategy: Use SimFin companies as the anchor (Single Source of Truth).
        """
        try:
            # 1. Try to get symbols that have SimFin Company data
            # SimFin bulk ingest saves to stock_list_fmp (as per current schema) or similar.
            # We filter for symbols that actually exist in our DB metadata.
            sql = "SELECT DISTINCT symbol FROM stock_list_fmp"
            df_db = self._db_manager.query(sql)

            if not df_db.is_empty():
                symbols = df_db["symbol"].to_list()
                # If we have too few, it might be a partial sync.
                # If we have > 500, we consider the anchor established.
                if len(symbols) > 500:
                    logger.info(f"⚓ SimFin Anchor established: Tracking {len(symbols)} active symbols.")
                    return symbols

            # 2. Bootstrap Fallback (If DB is empty)
            # Fetch full list from FMP and filter for US Majors (NYSE/NASDAQ)
            logger.info("Universe not anchored. Bootstrapping from FMP Stock List...")
            full_list = self._fmp_client.get_stock_list()

            # Filter for tradeable US Equities only
            active_list = full_list[
                (full_list["type"] == "stock") &
                (full_list["exchangeShortName"].isin(["NYSE", "NASDAQ"])) &
                (full_list["price"] > 1.0) # Avoid extreme penny stocks
            ]

            symbols = active_list["symbol"].head(5500).tolist() # Limit to SimFin scale
            logger.info(f"🚀 Bootstrap complete: tracking top {len(symbols)} liquid US symbols.")
            return symbols

        except Exception as e:
            logger.error(f"Failed to resolve active universe: {e}")
            return ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META"] # Minimal Safety Net

    def stock_list(
        self,
        asset_type: str = "stock",
        exchanges: Optional[List[str]] = None,
        min_price: float = 5.0,
    ) -> pd.DataFrame:
        """
        Get filtered list of tradeable symbols.
        
        Args:
            asset_type: Filter by asset type ('stock', 'etf', etc.)
            exchanges: List of exchanges to include (defaults to NYSE, NASDAQ)
            min_price: Minimum price filter
            
        Returns:
            DataFrame with symbol, name, exchange, type columns
        """
        if exchanges is None:
            exchanges = [Exchange.NYSE.value, Exchange.NASDAQ.value]

        logger.info(f"Fetching stock list for {asset_type} from {exchanges}")

        stock_list = self._fmp_client.get_stock_list()

        # Filter by asset type
        if asset_type:
            stock_list = stock_list[stock_list["type"] == asset_type]

        # Filter by exchange
        stock_list = stock_list[stock_list["exchangeShortName"].isin(exchanges)]

        # Filter by price
        if min_price > 0 and "price" in stock_list.columns:
            stock_list = stock_list[stock_list["price"] >= min_price]

        logger.info(f"Filtered to {len(stock_list)} symbols")
        return stock_list

    # =====================
    # Price Data
    # =====================

    def bulk_historical_prices(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        symbols: Optional[List[str]] = None,
        use_cache: bool = True,
        progress_callback: Optional[Any] = None,
    ) -> pl.DataFrame:
        """
        Download bulk historical price data for all symbols.
        Supports Smart Resume (skips existing in DB) and Incremental Saving.
        """
        if end_date is None:
            end_date = date.today()
        if start_date is None:
            start_date = date(2000, 1, 1)

        # Reset stop signal for new run
        self.stop_requested = False

        # 1. Fetch Target Universe
        if symbols is None:
            stock_list = self._fmp_client.get_stock_list()
            if not stock_list.empty:
                symbols = stock_list["symbol"].tolist()
            else:
                symbols = []

        # 2. Smart Resume & Negative Caching
        try:
            # A. Smart Resume: Filter out symbols that ALREADY HAVE DATA
            # During a backfill/resume, if we have rows, we skip to save API credits.
            existing_symbols_df = self._db_manager.query("SELECT DISTINCT symbol FROM historical_prices_fmp")
            existing_symbols = set(existing_symbols_df["symbol"].to_list()) if not existing_symbols_df.is_empty() else set()

            # B. Negative Caching: Filter out symbols known to fail
            failed_symbols = set(self._db_manager.get_failed_symbols("historical_price"))

            original_count = len(symbols)

            # Filter: Only download if NOT in DB and NOT failed
            symbols = [
                s for s in symbols
                if s not in existing_symbols and s not in failed_symbols
            ]

            skipped_count = original_count - len(symbols)
            if skipped_count > 0:
                logger.info(f"⏭️ Optimization: Skipped {skipped_count} symbols already in database.")
                logger.info(f"📥 Pending workload: {len(symbols)} symbols.")
        except Exception as e:
            logger.warning(f"⚠️ Smart Resume check failed: {e}")

        if not symbols:
            logger.info("All symbols already downloaded or marked as failed.")
            if progress_callback: progress_callback(100, 100)
            return pl.DataFrame()

        logger.info(f"Fetching bulk historical prices from {start_date} to {end_date}")

        # 3. Download with Incremental Save
        # We pass upsert_prices via RemoteWriter to the Data Service
        prices = self._fmp_client.get_bulk_historical_prices(
            start_date=start_date,
            end_date=end_date,
            symbols=symbols,
            progress_callback=progress_callback,
            save_callback=self._writer.upsert_prices, # Remote Persistence
            failed_callback=lambda sym: self.log_failed_scan(sym, "historical_price"),
            stop_check=lambda: self.stop_requested # Kill Switch
        )

        return prices

    # =====================
    # SimFin Bulk Ingestion
    # =====================

    def ingest_simfin_bulk(self) -> Dict[str, int]:
        """
        Master Ingestion: Ingest all SimFin bulk data into DuckDB.
        Uses SimFin as the Single Source of Truth for fundamentals and ratios.
        """
        logger.info("🚀 Starting Master SimFin Ingestion (BASIC/PRO Mode)...")
        stats = {}

        # 1. Price Data & Point-in-Time Price Ratios
        try:
            # Stock List (Companies)
            companies = self._simfin_client.get_stock_list()
            if not companies.empty:
                companies = companies.reset_index()
                if "Ticker" in companies.columns: companies = companies.rename(columns={"Ticker": "symbol"})
                if "Company Name" in companies.columns: companies = companies.rename(columns={"Company Name": "name"})
                if "IndustryId" in companies.columns: companies = companies.rename(columns={"IndustryId": "industry_id"})

                if "symbol" in companies.columns:
                    companies = companies.dropna(subset=["symbol"])
                    companies["exchange"] = "US"
                    companies["asset_type"] = "stock"
                    companies["price"] = 0.0

                    if "CIK" in companies.columns:
                        companies["cik"] = companies["CIK"].apply(lambda x: str(int(x)).zfill(10) if pd.notnull(x) else None)
                    elif "SimFin Id" in companies.columns:
                        companies["cik"] = companies["SimFin Id"].astype(str)

                    # Stock list ingestion uses RemoteWriter
                    self._writer.execute("CREATE TEMP TABLE temp_stocks AS SELECT * FROM ?", [companies])
                    self._writer.execute("INSERT OR REPLACE INTO stock_list_fmp SELECT * FROM temp_stocks")
                    stats["stock_list"] = len(companies)
                    logger.info(f"✅ Ingested {stats['stock_list']} companies.")

            # Prices
            prices = self._simfin_client.get_share_prices(variant='daily')
            if not prices.is_empty():
                if "Ticker" in prices.columns: prices = prices.rename({"Ticker": "symbol"})
                if "Date" in prices.columns: prices = prices.rename({"Date": "date"})
                mapping = {"Open": "open", "High": "high", "Low": "low", "Close": "close", "Adj. Close": "adj_close", "Volume": "volume"}
                existing_map = {old: new for old, new in mapping.items() if old in prices.columns}
                if existing_map: prices = prices.rename(existing_map)

                if "symbol" in prices.columns and "date" in prices.columns:
                    prices = prices.drop_nulls(subset=["symbol", "date"])
                    stats["prices"] = self._writer.upsert_prices(prices)
                    logger.info(f"✅ Successfully ingested {stats['prices']} SimFin prices.")

            # Price Ratios
            p_ratios = self._simfin_client.get_share_price_ratios(variant='daily')
            if p_ratios is not None and not p_ratios.is_empty():
                mapping_r = {"Ticker": "symbol", "Date": "date"}
                existing_map_r = {old: new for old, new in mapping_r.items() if old in p_ratios.columns}
                if existing_map_r: p_ratios = p_ratios.rename(existing_map_r)
                stats["price_ratios_daily"] = self._writer.upsert_fundamentals("price_ratios", "daily", p_ratios)
        except Exception as e:
            logger.error(f"SimFin price/ratio ingestion failed: {e}")

        # 2. Fundamentals & Derived Ratios
        templates = ["normal", "banks", "insurance"]
        statements = ["income", "balance", "cashflow"]

        for template in templates:
            for stmt in statements:
                try:
                    df = self._simfin_client.get_bulk_fundamentals(statement=stmt, variant='quarterly', template=template)
                    if not df.is_empty():
                        if "Ticker" in df.columns: df = df.rename({"Ticker": "symbol"})
                        if "Report Date" in df.columns: df = df.rename({"Report Date": "date"})
                        table_suffix = f"_{template}" if template != "normal" else ""
                        count = self._writer.upsert_fundamentals(f"{stmt}{table_suffix}", "quarter", df)
                        stats[f"{stmt}_{template}_quarterly"] = count
                except Exception as e:
                    logger.error(f"SimFin {template} {stmt} failed: {e}")

            # 3. Derived Ratios
            try:
                ratios = self._simfin_client.get_derived_ratios(variant='quarterly', template=template)
                if not ratios.is_empty():
                    if "Ticker" in ratios.columns: ratios = ratios.rename({"Ticker": "symbol"})
                    if "Report Date" in ratios.columns: ratios = ratios.rename({"Report Date": "date"})
                    table_suffix = f"_{template}" if template != "normal" else ""
                    stats[f"ratios_{template}_quarterly"] = self._writer.upsert_fundamentals(f"ratios{table_suffix}", "quarter", ratios)
            except Exception as e:
                logger.error(f"SimFin ratios {template} failed: {e}")

        return stats

    # =====================
    # Fundamental Data
    # =====================

    def fetch_bulk_financial_statements(
        self,
        statement_type: List[str],
        periods: str = "all",
        start_year: int = 2000,
        end_year: Optional[int] = None,
        api_buffer_seconds: int = 10,
    ) -> Dict[str, pl.DataFrame]:
        """
        Download bulk financial statement data via Data Service.
        """
        if end_year is None:
            end_year = datetime.now().year

        results = {}

        for stmt_type in statement_type:
            logger.info(f"Fetching {stmt_type} statements from {start_year} to {end_year}")

            data = self._fmp_client.get_bulk_financial_statements(
                statement_type=stmt_type,
                periods=periods,
                start_year=start_year,
                end_year=end_year,
                api_buffer_seconds=api_buffer_seconds,
            )

            if data is not None:
                # Store via RemoteWriter
                self._writer.upsert_fundamentals(stmt_type, periods if periods != "all" else "quarter", data)
                results[stmt_type] = data

        return results

    # =====================
    # Cache Management
    # =====================

    def detect_cached_files(self) -> pd.DataFrame:
        """Get a list of all cached parquet files."""
        return self._cache_manager.list_cached_files()

    def log_failed_scan(self, symbol: str, data_type: str, reason: str = "Empty Result") -> None:
        """Log a symbol that returned no data via RemoteWriter."""
        try:
            sql = "INSERT OR IGNORE INTO failed_scans (symbol, data_type, reason) VALUES (?, ?, ?)"
            self._writer.execute(sql, [symbol, data_type, reason])
        except Exception as e:
            logger.error(f"Failed to log failed scan: {e}")

    def log_event(self, level: str, component: str, message: str, details: Optional[Dict] = None) -> None:
        """Log a system event to the database telemetry table via RemoteWriter."""
        try:
            import json
            details_json = json.dumps(details) if details else None
            sql = "INSERT INTO system_logs (level, component, message, details) VALUES (?, ?, ?, ?)"
            self._writer.execute(sql, [level, component, message, details_json])
        except Exception as e:
            logger.error(f"Failed to log event to DB: {e}")

    # =====================
    # Database Operations
    # =====================

    def connect_db(self):
        """Establish connection to DuckDB database."""
        return self._db_manager.connect()

    def query(self, sql: str) -> pl.DataFrame:
        """Execute a SQL query against the database."""
        return self._db_manager.query(sql)

    def get_latest_prices(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get latest prices using the shared QS Connect client.
        """
        sql = f"""
            SELECT symbol, date, close, volume, change_percent
            FROM historical_prices_fmp
            WHERE date = (SELECT MAX(date) FROM historical_prices_fmp)
            ORDER BY symbol
            LIMIT {limit}
        """
        df = self._db_manager.query(sql)
        return df.to_dicts()

    # =====================
    # Zipline Bundle
    # =====================

    def build_zipline_bundle(
        self,
        bundle_name: str = "historical_prices_fmp",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> None:
        """
        Build a Zipline-compatible data bundle.
        """
        logger.info(f"Building Zipline bundle: {bundle_name}")
        self._bundler.build_bundle(
            bundle_name=bundle_name,
            start_date=start_date,
            end_date=end_date,
        )

    def register_bundle(self, bundle_name: str) -> None:
        """Register a bundle with Zipline."""
        self._bundler.register_bundle(bundle_name)

    def ingest_bundle(self, bundle_name: str) -> None:
        """Ingest a registered bundle into Zipline."""
        self._bundler.ingest_bundle(bundle_name)

    def close(self) -> None:
        """Close all connections."""
        self._db_manager.close()
        logger.info("QS Connect client closed")
