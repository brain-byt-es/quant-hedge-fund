from typing import Any, Dict

import pandas as pd
from loguru import logger
from openbb import obb


class OpenBBClient:
    """
    Modular Data Hub using OpenBB Platform.
    Fungiert als 'LEGO'-Adapter für verschiedene Datenquellen.
    """

    def __init__(self):
        # OpenBB Platform is stateless by default in Python SDK
        logger.info("OpenBB Platform SDK initialized as primary data pipeline")

    def get_equity_profile(self, symbol: str, provider: str = "fmp") -> Dict[str, Any]:
        """Fetch company profile via OpenBB."""
        try:
            res = obb.equity.profile(symbol=symbol, provider=provider)
            df = res.to_df()
            return df.iloc[0].to_dict() if not df.empty else {}
        except Exception as e:
            logger.error(f"OpenBB Profile Error ({symbol}): {e}")
            return {}

    def get_historical_prices(self, symbol: str, start_date: str, end_date: str, provider: str = "fmp") -> pd.DataFrame:
        """Fetch historical price data."""
        try:
            res = obb.equity.price.historical(
                symbol=symbol,
                start_date=start_date,
                end_date=end_date,
                provider=provider
            )
            return res.to_df()
        except Exception as e:
            logger.error(f"OpenBB Price Error ({symbol}): {e}")
            return pd.DataFrame()

    def get_financials(self, symbol: str, statement_type: str = "income", provider: str = "fmp") -> pd.DataFrame:
        """Fetch financial statements (income, balance, cash)."""
        try:
            if statement_type == "income":
                res = obb.equity.fundamental.income(symbol=symbol, provider=provider)
            elif statement_type == "balance":
                res = obb.equity.fundamental.balance(symbol=symbol, provider=provider)
            else:
                res = obb.equity.fundamental.cash(symbol=symbol, provider=provider)

            return res.to_df()
        except Exception as e:
            logger.error(f"OpenBB Financials Error ({symbol}/{statement_type}): {e}")
            return pd.DataFrame()

    def get_valuation_ratios(self, symbol: str, provider: str = "fmp") -> pd.DataFrame:
        """Fetch key metrics and ratios."""
        try:
            # OpenBB uses specific endpoints for ratios
            res = obb.equity.fundamental.ratios(symbol=symbol, provider=provider)
            return res.to_df()
        except Exception as e:
            logger.error(f"OpenBB Ratios Error ({symbol}): {e}")
            return pd.DataFrame()
