"""
QS Connect - SimFin API Client
Wrapper for the SimFin Python library to provide standardized Polars access.
Optimized for BASIC/PRO accounts with quarterly granularity.
"""

import os
from pathlib import Path

import pandas as pd
import polars as pl
import simfin as sf
from loguru import logger
from simfin.names import *


class SimFinClient:
    """
    Client for SimFin Data.
    Focused on bulk loading of fundamental and price data.
    """

    def __init__(self, api_key: str, data_dir: str = None):
        """
        Initialize SimFin.
        Args:
            api_key: SimFin API Key (BASIC/PRO recommended)
            data_dir: Local directory for caching large datasets
        """
        if data_dir is None:
            # Default to /app/data/simfin using PROJECT_ROOT
            root = Path(os.getenv("PROJECT_ROOT", str(Path(__file__).resolve().parent.parent.parent.parent)))
            data_dir = str(root / "data/simfin")

        sf.set_api_key(api_key)
        sf.set_data_dir(data_dir)
        logger.info(f"SimFin client initialized. Cache directory: {data_dir}")

    def get_bulk_fundamentals(self, statement: str = "income", variant: str = "quarterly", template: str = "normal") -> pl.DataFrame:
        """
        Load fundamental datasets (Bulk).
        Args:
            statement: 'income', 'balance', or 'cashflow'
            variant: 'annual', 'quarterly', or 'ttm'
            template: 'normal', 'banks', or 'insurance'
        """
        logger.info(f"Loading SimFin bulk data: {statement} ({variant}, template={template})...")
        try:
            if template == "banks":
                if statement == "income": df = sf.load_income_banks(variant=variant, market='us')
                elif statement == "balance": df = sf.load_balance_banks(variant=variant, market='us')
                elif statement == "cashflow": df = sf.load_cashflow_banks(variant=variant, market='us')
                else: raise ValueError("Invalid statement type.")
            elif template == "insurance":
                if statement == "income": df = sf.load_income_insurance(variant=variant, market='us')
                elif statement == "balance": df = sf.load_balance_insurance(variant=variant, market='us')
                elif statement == "cashflow": df = sf.load_cashflow_insurance(variant=variant, market='us')
                else: raise ValueError("Invalid statement type.")
            else: # Normal
                if statement == "income": df = sf.load_income(variant=variant, market='us')
                elif statement == "balance": df = sf.load_balance(variant=variant, market='us')
                elif statement == "cashflow": df = sf.load_cashflow(variant=variant, market='us')
                else: raise ValueError("Invalid statement type.")

            return pl.from_pandas(df.reset_index())
        except Exception as e:
            logger.error(f"Failed to load SimFin fundamentals ({statement}, {template}): {e}")
            return pl.DataFrame()

    def get_derived_ratios(self, variant: str = "quarterly", template: str = "normal") -> pl.DataFrame:
        """
        Exclusive for BASIC/PRO: Load pre-calculated ratios (EBITDA, ROIC, etc.)
        """
        logger.info(f"Loading SimFin derived ratios ({variant}, template={template})...")
        try:
            if template == "banks":
                df = sf.load(dataset='derived-banks', variant=variant, market='us')
            elif template == "insurance":
                df = sf.load(dataset='derived-insurance', variant=variant, market='us')
            else:
                df = sf.load(dataset='derived', variant=variant, market='us')
            return pl.from_pandas(df.reset_index())
        except Exception as e:
            logger.error(f"Failed to load SimFin ratios ({template}): {e}")
            return pl.DataFrame()

    def get_share_prices(self, variant: str = "daily") -> pl.DataFrame:
        """Loads historical share prices for the entire universe."""
        logger.info(f"Loading SimFin bulk share prices ({variant})...")
        try:
            df = sf.load_shareprices(variant=variant, market='us')
            return pl.from_pandas(df.reset_index())
        except Exception as e:
            logger.error(f"Failed to load SimFin prices: {e}")
            return pl.DataFrame()

    def get_share_price_ratios(self, variant: str = "daily") -> pl.DataFrame:
        """Loads daily share price ratios (P/E, P/S, etc.) using Publish Date."""
        logger.info(f"Loading SimFin bulk price ratios ({variant})...")
        try:
            df = sf.load(dataset='derived-shareprices', variant=variant, market='us')
            return pl.from_pandas(df.reset_index())
        except Exception as e:
            logger.error(f"Failed to load SimFin price ratios: {e}")
            return pl.DataFrame()

    def get_stock_list(self) -> pd.DataFrame:
        """Returns the list of companies covered by SimFin."""
        try:
            return sf.load_companies(market='us')
        except Exception as e:
            logger.error(f"Failed to load SimFin companies: {e}")
            return pd.DataFrame()
