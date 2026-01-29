import duckdb
from pathlib import Path
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config.settings import get_settings

def debug():
    settings = get_settings()
    print(f"Connecting to DB: {settings.duckdb_path}")
    
    try:
        conn = duckdb.connect(str(settings.duckdb_path), read_only=True)
        
        print("\n--- Factor Snapshot Sample ---")
        res = conn.execute("SELECT * FROM factor_ranks_snapshot LIMIT 5").df()
        print(res)
        
        print("\n--- Check Specific Symbol (e.g. AAPL, NVDA) ---")
        for sym in ["AAPL", "NVDA", "MSFT", "TSLA"]:
            res = conn.execute(f"SELECT symbol, f_score, momentum_score FROM factor_ranks_snapshot WHERE symbol = '{sym}'").df()
            if not res.empty:
                print(res)
            else:
                print(f"{sym}: Not found in snapshot.")
                
        print("\n--- Count ---")
        count = conn.execute("SELECT count(*) FROM factor_ranks_snapshot").fetchone()[0]
        print(f"Total Ranked Symbols: {count}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug()
