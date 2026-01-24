import duckdb
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class DuckDBClient:
    def __init__(self, db_path=":memory:"):
        # In production, this would point to a persistent .duckdb file
        self.conn = duckdb.connect(db_path)
        self._initialize_mock_data()

    def _initialize_mock_data(self):
        """
        Generates mock financial data for the prototype to simulate
        the '900 Million Rows' dataset.
        """
        # Check if table exists
        exists = self.conn.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'ohlcv'").fetchone()[0]
        if exists > 0:
            return

        print("Initializing DuckDB with mock data...")
        
        # Generate some mock data for AAPL, MSFT, SPY
        tickers = ['AAPL', 'MSFT', 'SPY', 'NVDA', 'TSLA']
        dfs = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        dates = pd.date_range(start=start_date, end=end_date, freq='D') # Daily for speed, could be minutely

        for ticker in tickers:
            base_price = np.random.uniform(100, 500)
            prices = base_price + np.cumsum(np.random.normal(0, 2, size=len(dates)))
            df = pd.DataFrame({
                'date': dates,
                'ticker': ticker,
                'open': prices + np.random.normal(0, 0.5, size=len(dates)),
                'high': prices + np.abs(np.random.normal(0, 1, size=len(dates))),
                'low': prices - np.abs(np.random.normal(0, 1, size=len(dates))),
                'close': prices,
                'volume': np.random.randint(100000, 5000000, size=len(dates))
            })
            dfs.append(df)
        
        full_df = pd.concat(dfs)
        self.conn.register('temp_ohlcv', full_df)
        self.conn.execute("CREATE TABLE ohlcv AS SELECT * FROM temp_ohlcv")
        self.conn.unregister('temp_ohlcv')
        print("DuckDB initialized.")

    def get_ohlcv(self, ticker: str, start_date: str = None, limit: int = 1000):
        """
        Retrieves OHLCV data for a specific ticker.
        """
        query = f"SELECT * FROM ohlcv WHERE ticker = '{ticker}'"
        if start_date:
            query += f" AND date >= '{start_date}'"
        query += f" ORDER BY date ASC LIMIT {limit}"
        
        return self.conn.execute(query).fetchdf().to_dict(orient='records')

    def get_latest_prices(self):
        """
        Get the most recent close price for all tickers.
        """
        query = """
            SELECT ticker, arg_max(close, date) as price, max(date) as last_updated 
            FROM ohlcv 
            GROUP BY ticker
        """
        return self.conn.execute(query).fetchdf().to_dict(orient='records')

# Singleton instance
duck_db = DuckDBClient()
