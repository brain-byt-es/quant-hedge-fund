"""
QS Connect - Data Layer Module

QS Connect is the data layer for the Quant Hedge Fund system.
It provides unified access to market data, fundamental data, and database operations.

Main Features:
- FMP API client for market and fundamental data
- DuckDB database management
- Parquet file caching
- Zipline bundle creation
"""

from qsconnect.client import Client
from qsconnect.api.fmp_client import FMPClient
from qsconnect.api.simfin_client import SimFinClient

__all__ = ["Client", "FMPClient", "SimFinClient"]
