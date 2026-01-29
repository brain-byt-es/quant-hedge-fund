import duckdb
from pathlib import Path
import os
import sys

# Add project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config.settings import get_settings

def debug():
    settings = get_settings()
    conn = duckdb.connect(str(settings.duckdb_path), read_only=True)
    
    print("\n--- NVDA Income (Last 2) ---")
    print(conn.execute("SELECT date, \"Net Income\", Revenue FROM bulk_income_quarter_fmp WHERE symbol = 'NVDA' ORDER BY date DESC LIMIT 2").df())
    
    print("\n--- NVDA Balance (Last 2) ---")
    print(conn.execute("SELECT date, \"Total Equity\" FROM bulk_balance_quarter_fmp WHERE symbol = 'NVDA' ORDER BY date DESC LIMIT 2").df())
    
    print("\n--- NVDA Cashflow (Last 2) ---")
    print(conn.execute("SELECT date, \"Net Cash from Operating Activities\" FROM bulk_cashflow_quarter_fmp WHERE symbol = 'NVDA' ORDER BY date DESC LIMIT 2").df())

if __name__ == "__main__":
    debug()
