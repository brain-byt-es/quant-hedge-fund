import sys
import os
import pandas as pd
import financedatabase as fd
from loguru import logger
from datetime import datetime

# Ensure backend is in path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../.."))

from api.routers.data import get_qs_client

class FinanceDBSosync:
    """
    Synchronizes the global asset universe from FinanceDatabase (JerBouma)
    into the local DuckDB 'master_assets_index'.
    """
    
    def __init__(self):
        self.client = get_qs_client()
        self.db = self.client._db_manager
        
    def sync_all(self):
        logger.info("🌍 Starting Global Asset Sync via FinanceDatabase...")
        
        self.sync_equities()
        self.sync_etfs()
        self.sync_cryptos()
        self.sync_indices()
        self.sync_currencies()
        self.sync_funds()
        
        logger.success("✅ Global Asset Sync Complete.")

    def _bulk_insert(self, df: pd.DataFrame, asset_type: str):
        if df.empty:
            logger.warning(f"No data found for {asset_type}")
            return

        # Standardization
        df = df.reset_index() # 'symbol' is often the index in fd
        
        # Ensure columns exist before renaming
        cols = df.columns.tolist()
        
        # Mapping logic
        # Schema: symbol, name, type, category, exchange, country, currency, market_cap, isin, cusip
        
        # Create a standardized DataFrame
        standard_df = pd.DataFrame()
        standard_df['symbol'] = df['symbol'] if 'symbol' in cols else df.index
        standard_df['name'] = df['name'] if 'name' in cols else "Unknown"
        standard_df['type'] = asset_type
        
        # Category Logic
        if asset_type == 'Equity':
            standard_df['category'] = df['sector'].fillna('') + " - " + df['industry'].fillna('')
        elif asset_type == 'ETF':
            standard_df['category'] = df['category_group'].fillna('') + " - " + df['category'].fillna('')
        elif asset_type == 'Fund':
            standard_df['category'] = df['category_group'].fillna('') + " - " + df['category'].fillna('')
        elif asset_type == 'Crypto':
            standard_df['category'] = 'Cryptocurrency'
        elif asset_type == 'Index':
            standard_df['category'] = df['category'].fillna('Index') if 'category' in cols else 'Index'
        elif asset_type == 'Currency':
            standard_df['category'] = 'Fiat Currency'
        else:
            standard_df['category'] = 'Other'
            
        standard_df['exchange'] = df['exchange'] if 'exchange' in cols else 'N/A'
        standard_df['country'] = df['country'] if 'country' in cols else 'Global'
        standard_df['currency'] = df['currency'] if 'currency' in cols else 'N/A'
        standard_df['market_cap'] = df['market_cap'] if 'market_cap' in cols else None
        standard_df['isin'] = df['isin'] if 'isin' in cols else None
        standard_df['cusip'] = df['cusip'] if 'cusip' in cols else None
        standard_df['updated_at'] = datetime.now()
        
        # Clean up category (remove leading/trailing ' - ' if missing parts)
        standard_df['category'] = standard_df['category'].astype(str).str.strip(' - ')
        
        # Fill NaNs
        standard_df = standard_df.fillna("N/A")
        
        count = len(standard_df)
        logger.info(f"Inserting {count} {asset_type}s...")
        
        # DuckDB Insert
        con = self.db.connect()
        try:
            con.register('temp_assets', standard_df)
            con.execute("""
                INSERT OR REPLACE INTO master_assets_index 
                (symbol, name, type, category, exchange, country, currency, market_cap, isin, cusip, updated_at)
                SELECT symbol, name, type, category, exchange, country, currency, market_cap, isin, cusip, updated_at 
                FROM temp_assets
            """)
            con.unregister('temp_assets')
        except Exception as e:
            logger.error(f"Failed to insert {asset_type}: {e}")
        finally:
            con.close()

    def sync_equities(self):
        logger.info("Fetching Equities...")
        equities = fd.Equities()
        # Fetching all can be heavy, let's try country by country or just select() for all
        # select() with no args returns everything but might take time.
        # Let's trust the library's efficiency.
        try:
            df = equities.select()
            self._bulk_insert(df, "Equity")
        except Exception as e:
            logger.error(f"Equities Sync Error: {e}")

    def sync_etfs(self):
        logger.info("Fetching ETFs...")
        etfs = fd.ETFs()
        try:
            df = etfs.select()
            self._bulk_insert(df, "ETF")
        except Exception as e:
            logger.error(f"ETF Sync Error: {e}")

    def sync_cryptos(self):
        logger.info("Fetching Cryptos...")
        cryptos = fd.Cryptos()
        try:
            df = cryptos.select()
            self._bulk_insert(df, "Crypto")
        except Exception as e:
            logger.error(f"Crypto Sync Error: {e}")

    def sync_indices(self):
        logger.info("Fetching Indices...")
        indices = fd.Indices()
        try:
            df = indices.select()
            self._bulk_insert(df, "Index")
        except Exception as e:
            logger.error(f"Index Sync Error: {e}")

    def sync_currencies(self):
        logger.info("Fetching Currencies...")
        currencies = fd.Currencies()
        try:
            df = currencies.select()
            self._bulk_insert(df, "Currency")
        except Exception as e:
            logger.error(f"Currency Sync Error: {e}")

    def sync_funds(self):
        logger.info("Fetching Mutual Funds...")
        funds = fd.Funds()
        try:
            df = funds.select()
            self._bulk_insert(df, "Fund")
        except Exception as e:
            logger.error(f"Fund Sync Error: {e}")

if __name__ == "__main__":
    syncer = FinanceDBSosync()
    syncer.sync_all()
