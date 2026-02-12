import simfin as sf
import duckdb
from config.settings import get_settings
from qsconnect import Client as QSConnectClient
import pandas as pd
from loguru import logger

def reanchor_universe():
    settings = get_settings()
    client = QSConnectClient()
    
    logger.info("⚓ Re-anchoring universe from local SimFin files...")
    
    # 1. Load SimFin companies from disk (already downloaded)
    sf.set_data_dir("data/simfin")
    try:
        companies = sf.load_companies(market='us')
        companies = companies.reset_index()
        
        # Mapping for our schema
        companies = companies.rename(columns={
            "Ticker": "symbol",
            "Company Name": "name",
            "CIK": "cik_raw"
        })
        
        # Format CIK properly
        if "cik_raw" in companies.columns:
            companies["cik"] = companies["cik_raw"].apply(lambda x: str(int(x)).zfill(10) if pd.notnull(x) else None)
        
        # 2. Hard Reset and Re-insert via SQL
        # We use a dedicated local connection to bypass manager overhead
        db_path = "data/quant.duckdb"
        con = duckdb.connect(db_path)
        
        try:
            con.execute("DELETE FROM stock_list_fmp")
            
            # Register the dataframe
            con.register('temp_simfin', companies)
            
            # Use INSERT OR IGNORE to be 100% safe against source duplicates
            con.execute("""
                INSERT OR IGNORE INTO stock_list_fmp (symbol, cik, name, updated_at)
                SELECT symbol, cik, name, CURRENT_TIMESTAMP
                FROM temp_simfin
                WHERE symbol IS NOT NULL
            """)
            
            count = con.execute("SELECT count(*) FROM stock_list_fmp").fetchone()[0]
            logger.success(f"✅ Universe re-anchored via SQL. Database has {count} symbols.")
        finally:
            con.close()
        
        count = client._db_manager.query("SELECT count(*) FROM stock_list_fmp")[0,0]
        logger.success(f"✅ Universe re-anchored. Database now knows {count} symbols again.")
        
    except Exception as e:
        logger.error(f"Re-anchoring failed: {e}")

if __name__ == "__main__":
    reanchor_universe()
