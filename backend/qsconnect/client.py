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
from qsconnect.database.remote_writer import RemoteWriter


class Client:
    """
    Main QS Connect client for data operations.
    Supports Unified Data Service architecture.
    """

    def __init__(
        self,
        fmp_api_key: Optional[str] = None,
        simfin_api_key: Optional[str] = None,
        datalink_api_key: Optional[str] = None,
        duckdb_path: Optional[Path] = None,
        cache_dir: Optional[Path] = None,
        read_only: bool = True,
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

        # IMPORTANT: In the Unified architecture, the Client DOES NOT 
        # initialize a local DuckDBManager. It uses the RemoteWriter for EVERYTHING.
        self._db_proxy = RemoteWriter()
        self._cache_manager = CacheManager(cache_dir=self._cache_dir)
        
        # Bundler still needs a local manager for Zipline ingestion if run locally,
        # but for standard API use, we avoid it.
        self._bundler = None 

        # Stop Signal for background tasks
        self._stop_requested = False

        logger.info(f"QS Connect client initialized in UNIFIED mode (Proxy to Data Service).")

    @property
    def stop_requested(self) -> bool:
        """Check if stop is requested via flag or file."""
        if self._stop_requested:
            return True
        signal_file = self._duckdb_path.parent / "ingest_stop.signal"
        return signal_file.exists()

    @stop_requested.setter
    def stop_requested(self, value: bool):
        self._stop_requested = value
        signal_file = self._duckdb_path.parent / "ingest_stop.signal"
        if value:
            try: signal_file.touch()
            except: pass
        else:
            try:
                if signal_file.exists(): signal_file.unlink()
            except: pass

    # =====================
    # Stock Universe
    # =====================

    def get_active_universe(self) -> List[str]:
        """Determine the 'Active Universe' via Data Service."""
        try:
            sql = "SELECT DISTINCT symbol FROM stock_list_fmp"
            df_db = self.query(sql)

            if not df_db.is_empty():
                symbols = df_db["symbol"].to_list()
                if len(symbols) > 500:
                    return symbols

            full_list = self._fmp_client.get_stock_list()
            active_list = full_list[
                (full_list["type"] == "stock") &
                (full_list["exchangeShortName"].isin(["NYSE", "NASDAQ"])) &
                (full_list["price"] > 1.0)
            ]
            return active_list["symbol"].head(5500).tolist()
        except Exception as e:
            logger.error(f"Failed to resolve active universe: {e}")
            return ["AAPL", "MSFT", "NVDA"]

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
        """Download bulk prices via Data Service proxy."""
        if end_date is None: end_date = date.today()
        if start_date is None: start_date = date(2000, 1, 1)

        if symbols is None:
            stock_list = self._fmp_client.get_stock_list()
            symbols = stock_list["symbol"].tolist() if not stock_list.empty else []

        try:
            existing_symbols_df = self.query("SELECT DISTINCT symbol FROM historical_prices_fmp")
            existing_symbols = set(existing_symbols_df["symbol"].to_list()) if not existing_symbols_df.is_empty() else set()
            
            symbols = [s for s in symbols if s not in existing_symbols]
        except: pass

        if not symbols: return pl.DataFrame()

        prices = self._fmp_client.get_bulk_historical_prices(
            start_date=start_date,
            end_date=end_date,
            symbols=symbols,
            progress_callback=progress_callback,
            save_callback=self._db_proxy.upsert_prices,
            failed_callback=lambda sym: self.log_failed_scan(sym, "historical_price"),
            stop_check=lambda: self.stop_requested
        )
        return prices

    # =====================
    # SimFin Bulk Ingestion
    # =====================

    def ingest_simfin_bulk(self) -> Dict[str, int]:
        """Ingest SimFin data using the Data Service proxy."""
        logger.info("🚀 Starting Master SimFin Ingestion...")
        stats = {}
        try:
            companies = self._simfin_client.get_stock_list()
            if not companies.empty:
                companies = companies.reset_index()
                companies = companies.rename(columns={"Ticker": "symbol", "Company Name": "name"})
                companies["exchange"] = "US"
                companies["asset_type"] = "stock"
                companies["price"] = 0.0
                stats["stock_list"] = self._db_proxy.upsert_stock_list(companies)

            prices = self._simfin_client.get_share_prices(variant='daily')
            if not prices.is_empty():
                prices = prices.rename({"Ticker": "symbol", "Date": "date", "Close": "close", "Volume": "volume"})
                stats["prices"] = self._db_proxy.upsert_prices(prices)
        except Exception as e:
            logger.error(f"SimFin Ingestion Proxy Error: {e}")
        return stats

    # =====================
    # Database Operations
    # =====================

    def query(self, sql: str) -> pl.DataFrame:
        """Execute a SQL query via the Data Service."""
        return self._db_proxy.query(sql)

    def execute(self, sql: str, params: Optional[List[Any]] = None):
        """Execute a SQL command via the Data Service."""
        return self._db_proxy.execute(sql, params)

    def get_latest_prices(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get latest prices via Data Service."""
        sql = f"""
            SELECT symbol, date, close, volume, change_percent
            FROM historical_prices_fmp
            WHERE date = (SELECT MAX(date) FROM historical_prices_fmp)
            ORDER BY symbol LIMIT {limit}
        """
        df = self.query(sql)
        return df.to_dicts()

    def log_failed_scan(self, symbol: str, data_type: str, reason: str = "Empty Result"):
        sql = "INSERT OR IGNORE INTO failed_scans (symbol, data_type, reason) VALUES (?, ?, ?)"
        self.execute(sql, [symbol, data_type, reason])

    def close(self) -> None:
        logger.info("QS Connect client proxy detached.")
