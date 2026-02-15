"""
QS Connect - Remote Writer Client
Proxy class that routes all database operations to the dedicated Data Service.
"""

import requests
from typing import List, Dict, Any, Optional
import pandas as pd
import polars as pl
from loguru import logger

class RemoteWriter:
    """
    Proxy for DuckDB operations.
    Talks to the Unified Data Service microservice on Port 8001.
    """
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url

    def query(self, sql: str) -> pl.DataFrame:
        """Execute a SQL query via the Data Service."""
        try:
            response = requests.post(
                f"{self.base_url}/query",
                json={"sql": sql},
                timeout=60
            )
            response.raise_for_status()
            data = response.json()
            return pl.from_dicts(data) if data else pl.DataFrame()
        except Exception as e:
            logger.error(f"Remote Query Failed: {e}")
            return pl.DataFrame()

    def query_pandas(self, sql: str) -> pd.DataFrame:
        """Execute a SQL query and return results as Pandas DataFrame via Proxy."""
        res = self.query(sql)
        if res.is_empty():
            return pd.DataFrame()
        return res.to_pandas()

    def execute(self, sql: str, params: Optional[List[Any]] = None):
        """Execute a SQL command via the Data Service."""
        try:
            response = requests.post(
                f"{self.base_url}/execute",
                json={"sql": sql, "params": params},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Remote Write Execution Failed: {e}")
            raise e

    def upsert_prices(self, df: pl.DataFrame) -> int:
        """Upsert prices via the Data Service."""
        try:
            data = df.to_dicts()
            response = requests.post(
                f"{self.base_url}/upsert/prices",
                json=data,
                timeout=60
            )
            response.raise_for_status()
            return response.json().get("count", 0)
        except Exception as e:
            logger.error(f"Remote Price Upsert Failed: {e}")
            return 0

    def upsert_fundamentals(self, statement_type: str, period: str, df: pl.DataFrame) -> int:
        """Upsert fundamentals via the Data Service."""
        try:
            data = df.to_dicts()
            response = requests.post(
                f"{self.base_url}/upsert/fundamentals",
                json={
                    "statement_type": statement_type,
                    "period": period,
                    "data": data
                },
                timeout=60
            )
            response.raise_for_status()
            return response.json().get("count", 0)
        except Exception as e:
            logger.error(f"Remote Fundamental Upsert Failed: {e}")
            return 0

    def upsert_stock_list(self, df: pd.DataFrame) -> int:
        """Upsert stock list via the Data Service."""
        try:
            data = df.to_dict(orient="records")
            response = requests.post(
                f"{self.base_url}/upsert/stock_list",
                json=data,
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("count", 0)
        except Exception as e:
            logger.error(f"Remote Stock List Upsert Failed: {e}")
            return 0

    def upsert_company_profiles(self, df: pd.DataFrame) -> int:
        """Upsert company profiles via the Data Service with redundant fallback."""
        try:
            data = df.to_dict(orient="records")
            # Try primary first
            try:
                response = requests.post(
                    f"{self.base_url}/upsert/profiles",
                    json=data,
                    timeout=30
                )
                if response.status_code == 404:
                    # Fallback to redundant if primary not yet reloaded
                    response = requests.post(
                        f"{self.base_url}/upsert/company_profiles",
                        json=data,
                        timeout=30
                    )
                response.raise_for_status()
                return response.json().get("count", 0)
            except Exception as inner_e:
                logger.error(f"Remote Profile Upsert (Attempt 1) failed: {inner_e}")
                # Last ditch fallback
                response = requests.post(
                    f"{self.base_url}/upsert/company_profiles",
                    json=data,
                    timeout=30
                )
                response.raise_for_status()
                return response.json().get("count", 0)
        except Exception as e:
            logger.error(f"Remote Profile Upsert Failed: {e}")
            return 0

    def calculate_historical_factors(self, start_date: str, end_date: str, frequency: str = "monthly") -> int:
        """Trigger historical factor calculation via Data Service."""
        try:
            response = requests.post(
                f"{self.base_url}/factors/historical",
                json={
                    "start_date": start_date,
                    "end_date": end_date,
                    "frequency": frequency
                },
                timeout=1200 # Large timeout for heavy batch
            )
            response.raise_for_status()
            return response.json().get("count", 0)
        except Exception as e:
            logger.error(f"Remote Historical Factors Failed: {e}")
            return 0

    def get_stats(self) -> List[Dict[str, Any]]:
        """Fetch table statistics via the Data Service."""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            response.raise_for_status()
            return response.json().get("tables", [])
        except Exception as e:
            logger.error(f"Remote Stats Failed: {e}")
            return []

    def clear_factor_history(self) -> bool:
        """Clear the factor history table via Data Service."""
        try:
            response = requests.post(f"{self.base_url}/factors/clear", timeout=30)
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Remote Clear Factors Failed: {e}")
            return False
