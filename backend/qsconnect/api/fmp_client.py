"""
QS Connect - Financial Modeling Prep (FMP) API Client

Client for interacting with the FMP API for market and fundamental data.
https://financialmodelingprep.com/developer/docs
"""

from datetime import date
from typing import Optional, List, Dict, Any
import time

import pandas as pd
import polars as pl
from loguru import logger
from tqdm import tqdm

from qsconnect.api.base_client import BaseAPIClient
from config.constants import FMP_RATE_LIMIT_PER_MINUTE, StatementType


class FMPClient(BaseAPIClient):
    """
    Client for Financial Modeling Prep API.
    
    Provides access to:
    - Stock lists and company profiles
    - Historical price data
    - Financial statements (income, balance sheet, cash flow)
    - Financial ratios and metrics
    """
    
    BASE_URL = "https://financialmodelingprep.com/api/v3"
    
    def __init__(self, api_key: str):
        """
        Initialize FMP client.
        
        Args:
            api_key: FMP API key
        """
        super().__init__(
            base_url=self.BASE_URL,
            api_key=api_key,
            rate_limit_per_minute=FMP_RATE_LIMIT_PER_MINUTE,
        )
        logger.info("FMP client initialized")
    
    # =====================
    # Stock Lists
    # =====================
    
    def get_stock_list(self) -> pd.DataFrame:
        """Get filtered tradable US stock universe (Price > $5, Type: Stock)."""
        data = self._make_request("https://financialmodelingprep.com/stable/stock-list")
        if data:
            df = pd.DataFrame(data)
            
            # 1. Exchange Filter (US Majors)
            us_exchanges = ["NASDAQ", "NYSE", "AMEX"]
            if "exchangeShortName" in df.columns:
                df = df[df["exchangeShortName"].isin(us_exchanges)]
            
            # 2. Asset Type Filter (Stocks only, no ETFs/Funds)
            if "type" in df.columns:
                df = df[df["type"] == "stock"]
            
            # 3. Price Filter (Quality threshold: > $5)
            if "price" in df.columns:
                # Ensure price is numeric
                df["price"] = pd.to_numeric(df["price"], errors='coerce')
                df = df[df["price"] >= 5.0]
            
            logger.info(f"Filtered universe to {len(df)} tradable US stocks.")
            return df
        return pd.DataFrame()

    def get_starter_fundamentals(
        self,
        symbols: List[str],
        statement_type: str,
        limit: int = 5,
        stop_check: Optional[callable] = None,
        progress_callback: Optional[callable] = None
    ) -> pl.DataFrame:
        """
        Fetch annual fundamentals for a list of symbols with stop support.
        """
        import concurrent.futures
        all_dfs = []
        total = len(symbols)
        
        def _fetch_one(symbol):
            # Check for stop signal inside worker
            if stop_check and stop_check():
                return "STOP"
            
            try:
                # Use STABLE endpoint format: stable/income-statement?symbol=AAPL
                endpoint = f"https://financialmodelingprep.com/stable/{statement_type}"
                params = {"symbol": symbol, "period": "annual", "limit": limit}
                
                data = self._make_request(endpoint, params=params)
                if data:
                    return pd.DataFrame(data)
            except:
                pass
            return None

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            # We use as_completed to handle termination better
            future_to_symbol = {executor.submit(_fetch_one, sym): sym for sym in symbols}
            
            completed = 0
            for future in concurrent.futures.as_completed(future_to_symbol):
                if stop_check and stop_check():
                    logger.warning(f"Stop signal received during {statement_type} ingestion.")
                    executor.shutdown(wait=False, cancel_futures=True)
                    break
                
                result = future.result()
                if isinstance(result, str) and result == "STOP": break
                
                if result is not None and not result.empty:
                    all_dfs.append(result)
                
                completed += 1
                if progress_callback:
                    progress_callback(completed, total, f"Ingesting {statement_type}")
        
        if all_dfs:
            return pl.from_pandas(pd.concat(all_dfs, ignore_index=True))
        return pl.DataFrame()
    
    def get_etf_list(self) -> pd.DataFrame:
        """Get list of available ETFs."""
        data = self._make_request("etf/list")
        if data:
            return pd.DataFrame(data)
        return pd.DataFrame()
    
    def get_tradeable_symbols(self) -> pd.DataFrame:
        """Get list of all tradeable symbols."""
        data = self._make_request("available-traded/list")
        if data:
            return pd.DataFrame(data)
        return pd.DataFrame()
    
    # =====================
    # Company Profiles
    # =====================
    
    def get_company_profile(self, symbol: str) -> Dict[str, Any]:
        """Get company profile for a symbol using stable endpoint."""
        url = "https://financialmodelingprep.com/stable/profile"
        params = {"symbol": symbol}
        data = self._make_request(url, params=params)
        if data and len(data) > 0:
            return data[0]
        return {}
    
    def get_company_profiles_batch(self, symbols: List[str]) -> pd.DataFrame:
        """Get company profiles for multiple symbols (batch of up to 50)."""
        symbols_str = ",".join(symbols[:50])
        data = self._make_request(f"profile/{symbols_str}")
        if data:
            return pd.DataFrame(data)
        return pd.DataFrame()
    
    # =====================
    # Historical Prices
    # =====================
    
    def get_historical_prices(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> pd.DataFrame:
        """
        Get historical daily prices for a symbol.
        
        Args:
            symbol: Stock symbol
            start_date: Start date for data
            end_date: End date for data
            
        Returns:
            DataFrame with OHLCV data
        """
        params = {"symbol": symbol}
        if start_date:
            params["from"] = start_date.isoformat()
        if end_date:
            params["to"] = end_date.isoformat()
        
        data = self._make_request(f"https://financialmodelingprep.com/stable/historical-price-full", params=params)
        
        if data and "historical" in data:
            df = pd.DataFrame(data["historical"])
            df["symbol"] = symbol
            return df
        return pd.DataFrame()

    def get_bulk_historical_prices(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        symbols: Optional[List[str]] = None,
        progress_callback: Optional[Any] = None,
        save_callback: Optional[Any] = None,
        failed_callback: Optional[Any] = None,
        stop_check: Optional[Any] = None,
    ) -> pl.DataFrame:
        """
        Get bulk historical prices with incremental saving and stop signal support.
        """
        import concurrent.futures
        
        if symbols is None:
            stock_df = self.get_stock_list()
            if stock_df.empty:
                return pl.DataFrame()
            symbols = stock_df["symbol"].tolist()
        
        total_symbols = len(symbols)
        logger.info(f"Starting bulk download for {total_symbols} symbols...")
        
        all_data = []
        batch_buffer = []
        
        # Helper for parallel execution
        def _fetch_symbol(symbol: str):
            # Check for stop signal inside worker thread
            if stop_check and stop_check():
                return None
                
            params = {"symbol": symbol}
            if start_date:
                params["from"] = start_date.isoformat()
            if end_date:
                params["to"] = end_date.isoformat()
            
            url = "https://financialmodelingprep.com/stable/historical-price-eod/full"
            
            try:
                # Use self._make_request to benefit from thread-safe rate limiter
                data = self._make_request(url, params=params)
                
                if data:
                    if isinstance(data, list) and len(data) > 0:
                        df = pd.DataFrame(data)
                        df["symbol"] = symbol
                        return df
                    elif isinstance(data, dict) and "historical" in data:
                         df = pd.DataFrame(data["historical"])
                         df["symbol"] = symbol
                         return df
            except Exception:
                pass
            return None

        # Use 3 workers to stay well under the 300 calls/min limit (3 * 60 = 180)
        # This leaves room for other API tasks (fundamentals, profiles)
        max_workers = 3
        completed_count = 0
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_symbol = {executor.submit(_fetch_symbol, sym): sym for sym in symbols}
            
            pbar = tqdm(total=total_symbols, desc="Downloading Market Data", leave=True, dynamic_ncols=True)
            for future in concurrent.futures.as_completed(future_to_symbol):
                # Small yield to let the OS/Event loop breathe
                time.sleep(0.05)
                
                symbol = future_to_symbol[future]
                
                if stop_check and stop_check():
                    logger.warning("Stop signal received. Terminating ingestion engine...")
                    executor.shutdown(wait=False, cancel_futures=True)
                    break

                try:
                    result = future.result()
                    if result is not None and not result.empty:
                        # Defensive casting to float to prevent "Python int too large to convert to C long"
                        for col in ['volume', 'open', 'high', 'low', 'close', 'adj_close']:
                            if col in result.columns:
                                result[col] = result[col].astype(float)
                        
                        all_data.append(result)
                        batch_buffer.append(result)
                    else:
                        # Handle Empty/Failed Result
                        if failed_callback:
                            try:
                                failed_callback(symbol)
                            except Exception as e:
                                logger.error(f"Failed callback error for {symbol}: {e}")

                except Exception as e:
                    logger.error(f"Error processing batch result: {e}")
                
                completed_count += 1
                pbar.update(1)
                if progress_callback:
                    progress_callback(completed_count, total_symbols)
                
                # Incremental Save (Every 200 symbols to reduce DB lock contention)
                if save_callback and len(batch_buffer) >= 200:
                    try:
                        # Check stop signal before writing to DB
                        if stop_check and stop_check():
                            logger.warning("Stop signal detected. Skipping batch save.")
                            break

                        partial_df = pd.concat(batch_buffer, ignore_index=True)
                        save_callback(pl.from_pandas(partial_df))
                        batch_buffer = [] # Clear buffer on success
                        
                        # Pause longer after DB write to let other processes access DB
                        time.sleep(0.5)
                    except Exception as e:
                        logger.error(f"Incremental save failed (Retrying next tick): {e}")
                        # If locked, cool down longer
                        if "lock" in str(e).lower():
                            time.sleep(2.0)
                        else:
                            time.sleep(0.5)

            pbar.close()
        
        # Final Save (flush remaining buffer)
        if save_callback and batch_buffer:
             try:
                # One last check
                if not (stop_check and stop_check()):
                    partial_df = pd.concat(batch_buffer, ignore_index=True)
                    save_callback(pl.from_pandas(partial_df))
                    logger.info("Final batch saved.")
             except Exception as e:
                 logger.error(f"Final save failed: {e}")

        if all_data:
            combined = pd.concat(all_data, ignore_index=True)
            logger.info(f"Bulk download complete: {len(combined)} records")
            return pl.from_pandas(combined)
        
        return pl.DataFrame()
    
    # =====================
    # Financial Statements
    # =====================
    
    def get_income_statement(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 100,
    ) -> pd.DataFrame:
        """Get income statements for a symbol."""
        params = {"symbol": symbol, "period": period, "limit": limit}
        data = self._make_request(f"https://financialmodelingprep.com/stable/income-statement", params=params)
        if data:
            return pd.DataFrame(data)
        return pd.DataFrame()
    
    def get_balance_sheet(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 100,
    ) -> pd.DataFrame:
        """Get balance sheet statements for a symbol."""
        params = {"symbol": symbol, "period": period, "limit": limit}
        data = self._make_request(f"https://financialmodelingprep.com/stable/balance-sheet-statement", params=params)
        if data:
            return pd.DataFrame(data)
        return pd.DataFrame()
    
    def get_cash_flow_statement(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 100,
    ) -> pd.DataFrame:
        """Get cash flow statements for a symbol."""
        params = {"symbol": symbol, "period": period, "limit": limit}
        data = self._make_request(f"https://financialmodelingprep.com/stable/cash-flow-statement", params=params)
        if data:
            return pd.DataFrame(data)
        return pd.DataFrame()
    
    def get_financial_ratios(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 100,
    ) -> pd.DataFrame:
        """Get financial ratios for a symbol."""
        params = {"symbol": symbol, "period": period, "limit": limit}
        data = self._make_request(f"https://financialmodelingprep.com/stable/ratios", params=params)
        if data:
            return pd.DataFrame(data)
        return pd.DataFrame()
    
    def get_key_metrics(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 100,
    ) -> pd.DataFrame:
        """Get key metrics for a symbol."""
        params = {"symbol": symbol, "period": period, "limit": limit}
        data = self._make_request(f"https://financialmodelingprep.com/stable/key-metrics", params=params)
        if data:
            return pd.DataFrame(data)
        return pd.DataFrame()
    
    # =====================
    # Institutional Data Layers
    # =====================

    def get_insider_trades(self, symbol: str, limit: int = 100) -> pd.DataFrame:
        """
        Get recent insider trades for a symbol using the stable search endpoint.
        Focuses on open market transactions.
        """
        # Note: In stable API, searching by symbol requires /search suffix
        url = "https://financialmodelingprep.com/stable/insider-trading/search"
        params = {"symbol": symbol, "limit": limit}
        data = self._make_request(url, params=params)
        
        if not data:
            return pd.DataFrame()
            
        df = pd.DataFrame(data)
        
        # Filter logic for 'Institutional Grade' signal:
        # Focus on "P-Purchase" (Open market purchase) 
        if "transactionType" in df.columns:
            df["is_purchase"] = df["transactionType"].str.contains("Purchase|Buy", case=False, na=False)
            df["is_derivative"] = df["transactionType"].str.contains("Option|Exempt", case=False, na=False)
            
        return df

    def get_senate_trades(self, symbol: str) -> pd.DataFrame:
        """Get recent senate/house trading for a symbol using the stable endpoint."""
        url = "https://financialmodelingprep.com/stable/senate-trading"
        params = {"symbol": symbol}
        data = self._make_request(url, params=params)
        return pd.DataFrame(data) if data else pd.DataFrame()

    def get_stock_news(self, symbol: str, limit: int = 50) -> pd.DataFrame:
        """Get recent news for a symbol using the stable endpoint."""
        url = "https://financialmodelingprep.com/stable/news/stock"
        params = {"symbols": symbol, "limit": limit}
        data = self._make_request(url, params=params)
        return pd.DataFrame(data) if data else pd.DataFrame()

    def get_economic_indicator(self, name: str = "GDP") -> pd.DataFrame:
        """Get economic indicators (GDP, CPI, Unemployment, etc.)."""
        url = f"https://financialmodelingprep.com/stable/economic"
        params = {"name": name}
        data = self._make_request(url, params=params)
        return pd.DataFrame(data) if data else pd.DataFrame()

    def get_dcf_valuation(self, symbol: str) -> pd.DataFrame:
        """Get Discounted Cash Flow (DCF) valuation."""
        url = f"https://financialmodelingprep.com/stable/discounted-cash-flow"
        params = {"symbol": symbol}
        data = self._make_request(url, params=params)
        return pd.DataFrame(data) if data else pd.DataFrame()

    # =====================
    # Bulk Financial Data
    # =====================
    
    def get_bulk_financial_statements(
        self,
        statement_type: str,
        periods: str = "all",
        start_year: int = 2000,
        end_year: int = 2025,
        api_buffer_seconds: int = 10,
    ) -> pl.DataFrame:
        """
        Get bulk financial statements for all companies.
        
        Uses the bulk endpoints to efficiently download large amounts of data.
        
        Args:
            statement_type: Type of statement (income-statement, balance-sheet, etc.)
            periods: 'annual', 'quarter', or 'all'
            start_year: Start year
            end_year: End year
            api_buffer_seconds: Delay between API calls
            
        Returns:
            Polars DataFrame with all financial data
        """
        all_data = []
        
        period_list = ["annual", "quarter"] if periods == "all" else [periods]
        
        for period in period_list:
            logger.info(f"Fetching {period} data for {statement_type} statements...")
            
            for year in tqdm(
                range(start_year, end_year + 1),
                desc=f"{period.capitalize()} Progress ({statement_type})"
            ):
                cache_key = f"bulk-{statement_type}_{year}_{period}"
                
                # Use stable bulk endpoint
                if statement_type == "income-statement":
                    endpoint = "income-statement-bulk"
                elif statement_type == "balance-sheet-statement":
                    endpoint = "balance-sheet-statement-bulk"
                elif statement_type == "cash-flow-statement":
                    endpoint = "cash-flow-statement-bulk"
                elif statement_type == "ratios":
                    endpoint = "ratios-bulk"
                elif statement_type == "key-metrics":
                    endpoint = "key-metrics-bulk"
                else:
                    endpoint = f"{statement_type}-bulk"
                
                # Construct stable URL
                stable_url = f"https://financialmodelingprep.com/stable/{endpoint}"
                params = {"year": year, "period": period}
                data = self._make_request(stable_url, params=params)
                
                if data:
                    df = pd.DataFrame(data)
                    df["_year"] = year
                    df["_period"] = period
                    all_data.append(df)
                    logger.info(f"Cached data for key '{cache_key}'")
                
                # Buffer to avoid rate limiting
                time.sleep(api_buffer_seconds / 10)
        
        if all_data:
            combined = pd.concat(all_data, ignore_index=True)
            logger.info(f"Downloaded {len(combined)} {statement_type} records")
            return pl.from_pandas(combined)
        
        return pl.DataFrame()