"""
QS Connect - Main Client

The Client class is the primary interface for all data operations.
It provides methods to download, cache, and manage market and fundamental data.
"""

import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, date

import pandas as pd
import polars as pl
from loguru import logger

from config.settings import get_settings
from config.constants import (
    AssetType,
    Exchange,
    StatementType,
    Period,
    FMP_RATE_LIMIT_PER_MINUTE,
)
from qsconnect.api.fmp_client import FMPClient
from qsconnect.api.simfin_client import SimFinClient
from qsconnect.database.duckdb_manager import DuckDBManager
from qsconnect.cache.cache_manager import CacheManager
from qsconnect.bundle.zipline_bundler import ZiplineBundler


class Client:
    """
    Main QS Connect client for data operations.
    
    Example:
        >>> from qsconnect import Client
        >>> client = Client()
        >>> prices = client.bulk_historical_prices()
        >>> client.build_zipline_bundle("historical_prices_fmp")
    """
    
    def __init__(
        self,
        fmp_api_key: Optional[str] = None,
        simfin_api_key: Optional[str] = None,
        datalink_api_key: Optional[str] = None,
        duckdb_path: Optional[Path] = None,
        cache_dir: Optional[Path] = None,
        read_only: bool = False,
    ):
        """
        Initialize the QS Connect client.
        
        Args:
            fmp_api_key: FMP API key (defaults to environment variable)
            simfin_api_key: SimFin API key (defaults to environment variable)
            datalink_api_key: Datalink API key (defaults to environment variable)
            duckdb_path: Path to DuckDB database file
            cache_dir: Directory for parquet file cache
            read_only: Whether to open the database in read-only mode
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
            # A. Smart Resume: Filter out symbols already in DB
            existing_symbols = set(self._db_manager.get_symbols())
            
            # B. Negative Caching: Filter out symbols known to fail
            failed_symbols = set(self._db_manager.get_failed_symbols("historical_price"))
            
            original_count = len(symbols)
            
            # Filter
            symbols = [
                s for s in symbols 
                if s not in existing_symbols and s not in failed_symbols
            ]
            
            skipped_existing = original_count - len([s for s in symbols if s not in existing_symbols]) # Approx logic for log, but let's be precise
            skipped_failed = len(failed_symbols.intersection(set(symbols) if symbols else set())) 
            # Note: intersection logic above is slightly off because we already filtered 'symbols'. 
            # Correct stats:
            # We want to know how many were removed due to existing vs failed.
            # Simplified log:
            
            skipped_count = original_count - len(symbols)
            if skipped_count > 0:
                logger.info(f"⏭️ Optimization: Skipped {skipped_count} symbols (Existing in DB or marked as Failed).")
                logger.info(f"   - Known Failed: {len(failed_symbols)}")
                logger.info(f"📥 Pending workload: {len(symbols)} symbols.")
        except Exception as e:
            logger.warning(f"⚠️ Smart Resume check failed: {e}")

        if not symbols:
            logger.info("All symbols already downloaded or marked as failed.")
            if progress_callback: progress_callback(100, 100)
            return pl.DataFrame()

        logger.info(f"Fetching bulk historical prices from {start_date} to {end_date}")
        
        # 3. Download with Incremental Save
        # We pass upsert_prices as the callback to save batches immediately
        prices = self._fmp_client.get_bulk_historical_prices(
            start_date=start_date,
            end_date=end_date,
            symbols=symbols,
            progress_callback=progress_callback,
            save_callback=self._db_manager.upsert_prices, # Incremental Persistence
            failed_callback=lambda sym: self._db_manager.log_failed_scan(sym, "historical_price"), # Negative Caching
            stop_check=lambda: self.stop_requested # Kill Switch
        )
        
        # Cache the result (optional, might be partial if filtered)
        # if use_cache and prices is not None:
        #    self._cache_manager.set(cache_key, prices)
        
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
                # SimFin columns: Ticker, Company Name, IndustryId
                # Reset index to get Ticker as column if it's an index
                companies = companies.reset_index()
                
                # Check columns before rename
                if "Ticker" in companies.columns: 
                    companies = companies.rename(columns={"Ticker": "symbol"})
                
                if "Company Name" in companies.columns:
                    companies = companies.rename(columns={"Company Name": "name"})
                    
                if "IndustryId" in companies.columns:
                    companies = companies.rename(columns={"IndustryId": "industry_id"})

                # Clean and Validations
                if "symbol" in companies.columns:
                    # Remove entries without symbol
                    companies = companies.dropna(subset=["symbol"])
                    
                    # Add placeholders for missing columns
                    companies["exchange"] = "US"
                    companies["asset_type"] = "stock"
                    companies["price"] = 0.0 # Will be updated by price ingest or live feed
                    
                    stats["stock_list"] = self._db_manager.upsert_stock_list(companies)
                    logger.info(f"✅ Ingested {stats['stock_list']} companies.")
                else:
                    logger.error(f"Stock List missing 'symbol' column after mapping. Columns: {companies.columns}")

            # Prices
            prices = self._simfin_client.get_share_prices(variant='daily')
            if not prices.is_empty():
                # SimFin columns: Ticker, Date, Open, High, Low, Close, Adj. Close, Volume
                # Force rename known columns
                if "Ticker" in prices.columns: prices = prices.rename({"Ticker": "symbol"})
                if "Date" in prices.columns: prices = prices.rename({"Date": "date"})
                
                # Standardize other columns
                mapping = {
                    "Open": "open", "High": "high", "Low": "low", 
                    "Close": "close", "Adj. Close": "adj_close", "Volume": "volume"
                }
                existing_map = {old: new for old, new in mapping.items() if old in prices.columns}
                if existing_map: prices = prices.rename(existing_map)
                
                # Validation
                if "symbol" in prices.columns and "date" in prices.columns:
                    # Clean data: Remove rows with null PKs
                    prices = prices.drop_nulls(subset=["symbol", "date"])
                    
                    # Ensure types
                    prices = prices.with_columns([
                        pl.col("symbol").cast(pl.Utf8),
                        pl.col("date").cast(pl.Date)
                    ])
                    
                    stats["prices"] = self._db_manager.upsert_prices(prices)
                    logger.info(f"✅ Successfully ingested {stats['prices']} SimFin prices.")
                else:
                    logger.error(f"SimFin price columns missing PKs after mapping. Columns: {prices.columns}")
                
            # Price Ratios (Daily P/E, P/S etc. based on Publish Date)
            p_ratios = self._simfin_client.get_share_price_ratios(variant='daily')
            if p_ratios is not None and not p_ratios.is_empty():
                mapping_r = {"Ticker": "symbol", "Date": "date"}
                existing_map_r = {old: new for old, new in mapping_r.items() if old in p_ratios.columns}
                if existing_map_r: p_ratios = p_ratios.rename(existing_map_r)
                
                stats["price_ratios_daily"] = self._db_manager.upsert_fundamentals("price_ratios", "daily", p_ratios)
            else:
                logger.warning("SimFin daily price ratios unavailable or empty.")
        except Exception as e:
            logger.error(f"SimFin price/ratio ingestion failed: {e}")
            
        # 2. Fundamentals & Derived Ratios (Normal, Banks, Insurance)
        # We use 'quarterly' for maximum granularity as permitted by PRO key
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
                        count = self._db_manager.upsert_fundamentals(f"{stmt}{table_suffix}", "quarter", df)
                        stats[f"{stmt}_{template}_quarterly"] = count
                except Exception as e:
                    logger.error(f"SimFin {template} {stmt} failed: {e}")
            
            # 3. Derived Ratios (EBITDA, etc.)
            try:
                ratios = self._simfin_client.get_derived_ratios(variant='quarterly', template=template)
                if not ratios.is_empty():
                    if "Ticker" in ratios.columns: ratios = ratios.rename({"Ticker": "symbol"})
                    if "Report Date" in ratios.columns: ratios = ratios.rename({"Report Date": "date"})
                    table_suffix = f"_{template}" if template != "normal" else ""
                    stats[f"ratios_{template}_quarterly"] = self._db_manager.upsert_fundamentals(f"ratios{table_suffix}", "quarter", ratios)
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
        Download bulk financial statement data.
        
        Args:
            statement_type: List of statement types (income-statement, balance-sheet, etc.)
            periods: 'annual', 'quarter', or 'all'
            start_year: Start year for data
            end_year: End year for data
            api_buffer_seconds: Delay between API calls
            
        Returns:
            Dictionary of DataFrames by statement type
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
                # Cache and store
                cache_key = f"bulk_{stmt_type}_{start_year}_{end_year}"
                self._cache_manager.set(cache_key, data)
                self._db_manager.upsert_fundamentals(stmt_type, data)
                results[stmt_type] = data
        
        return results
    
    # =====================
    # Cache Management
    # =====================
    
    def detect_cached_files(self) -> pd.DataFrame:
        """Get a list of all cached parquet files."""
        return self._cache_manager.list_cached_files()
    
    def detect_missing_cached_files(
        self,
        statement_type: List[str],
        periods: str = "all",
        start_year: int = 2000,
        end_year: Optional[int] = None,
    ) -> List[str]:
        """Detect which files are missing from cache for incremental download."""
        return self._cache_manager.detect_missing(
            statement_type=statement_type,
            periods=periods,
            start_year=start_year,
            end_year=end_year,
        )
    
    def log_event(self, level: str, component: str, message: str, details: Optional[Dict] = None) -> None:
        """Log a system event to the database telemetry table."""
        try:
            self._db_manager.log_event(level, component, message, details)
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
        Get latest prices for all symbols.
        Reuses the existing database connection to avoid locking conflicts.
        """
        sql = f"""
            SELECT symbol, date, close, volume, change_percent
            FROM prices
            WHERE date = (SELECT MAX(date) FROM prices)
            ORDER BY symbol
            LIMIT {limit}
        """
        df = self._db_manager.query(sql)
        return df.to_dicts()

    def get_system_logs(self, limit: int = 100) -> pl.DataFrame:
        """Get recent system logs."""
        return self._db_manager.get_logs(limit)

    def get_data_health(self) -> pl.DataFrame:
        """Get data health statistics."""
        return self._db_manager.get_data_health()

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
        
        Args:
            bundle_name: Name for the bundle
            start_date: Start date for bundle data
            end_date: End date for bundle data
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
    
    # =====================
    # Index Management (Survivorship Bias)
    # =====================

    def sync_index_constituents(self, index_symbol: str = "^GSPC") -> int:
        """
        Download and sync historical index constituents for Point-in-Time accuracy.
        Currently supports S&P 500 (^GSPC).
        """
        logger.info(f"Syncing historical constituents for {index_symbol}...")
        
        if index_symbol == "^GSPC":
            df = self._fmp_client.get_historical_sp500_constituents()
        else:
            logger.warning(f"Index {index_symbol} not supported for auto-sync yet.")
            return 0
            
        if df.is_empty():
            logger.warning("No constituent data found.")
            return 0
            
        # Transform for DB
        # FMP usually gives current list + historical changes.
        # We need to map it to our schema.
        # Required: index_symbol, date, symbol
        # FMP Return format typically includes: symbol, name, sector, dateFirstAdded, founded, etc.
        # For a true Point-in-Time, we ideally need a timeseries. 
        # If FMP returns just current list + added dates, we can construct the history.
        # However, for this implementation, let's assume we store what we get and 
        # `get_point_in_time_universe` will handle the logic.
        
        # Adding 'index_symbol' column
        df = df.with_columns(pl.lit(index_symbol).alias("index_symbol"))
        
        # Ensure date column exists (use dateFirstAdded or today if missing)
        if "dateFirstAdded" in df.columns:
             # Use dateFirstAdded as the 'date' for the record, or fallback to a default
             df = df.with_columns(
                 pl.col("dateFirstAdded").fill_null(pl.lit("2000-01-01")).alias("date"),
                 pl.col("dateFirstAdded").alias("added_date")
             )
        else:
             df = df.with_columns(
                 pl.lit(date.today()).alias("date"),
                 pl.lit(None).alias("added_date")
             )
             
        # Cleanup column names
        # We need: index_symbol, date, symbol
        df_db = df.select([
            pl.col("index_symbol"),
            pl.col("date").cast(pl.Date),
            pl.col("symbol"),
            pl.col("added_date").cast(pl.Date),
            # removed_date might be in data if using a changes endpoint, else null
        ])
        
        if "removedDate" in df.columns:
             df_db = df_db.with_columns(pl.col("removedDate").alias("removed_date"))
        else:
             df_db = df_db.with_columns(pl.lit(None).cast(pl.Date).alias("removed_date"))
             
        count = self._db_manager.upsert_index_constituents(df_db)
        logger.info(f"Synced {count} constituent records for {index_symbol}")
        return count

    def get_point_in_time_universe(self, index_symbol: str, target_date: str) -> List[str]:
        """
        Get the list of symbols that were in the index on the target date.
        Handles survivorship bias by reconstructing the index composition.
        """
        # Logic:
        # Select all symbols where:
        # 1. added_date <= target_date
        # 2. (removed_date IS NULL OR removed_date > target_date)
        
        sql = f"""
            SELECT DISTINCT symbol 
            FROM index_constituents 
            WHERE index_symbol = '{index_symbol}'
            AND added_date <= '{target_date}'
            AND (removed_date IS NULL OR removed_date > '{target_date}')
        """
        
        df = self._db_manager.query(sql)
        if df.is_empty():
            # Fallback if we have no history (e.g. only current list loaded)
            logger.warning(f"No point-in-time data for {target_date}, checking for static list...")
            sql_static = f"SELECT DISTINCT symbol FROM index_constituents WHERE index_symbol = '{index_symbol}'"
            return self._db_manager.query(sql_static)["symbol"].to_list()
            
        return df["symbol"].to_list()

    # =====================
    # Utilities
    # =====================
    
    @staticmethod
    def root_path() -> Path:
        """Get the QS Connect root cache path."""
        return get_settings().cache_dir
    
    def close(self) -> None:
        """Close all connections."""
        self._db_manager.close()
        logger.info("QS Connect client closed")
