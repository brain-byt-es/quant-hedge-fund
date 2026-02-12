import duckdb
import pandas as pd
from loguru import logger
from qsconnect import Client as QSConnectClient

def repair_stitching():
    client = QSConnectClient()
    con = client._db_manager.connect()
    
    logger.info("🩺 Starting Data Integrity Repair (Un-Stitching Share Classes)...")
    
    try:
        # 1. Get all currently active symbols from FMP to see what SHOULD exist
        fmp_stocks = client._fmp_client.get_stock_list()
        active_fmp_symbols = set(fmp_stocks['symbol'].tolist())
        
        # 2. Get all aliases we created
        aliases_res = con.execute("SELECT source_symbol, master_symbol, cik FROM ticker_aliases").df()
        
        if aliases_res.empty:
            logger.info("No aliases found to check.")
            return

        repaired_count = 0
        for _, row in aliases_res.iterrows():
            source = str(row['source_symbol'])
            master = str(row['master_symbol'])
            
            # If BOTH symbols are in the FMP active list, they are separate share classes!
            if source in active_fmp_symbols and master in active_fmp_symbols:
                logger.warning(f"🚨 Incorrect Stitch detected: {source} and {master} are BOTH active share classes.")
                
                # A. Use a fresh temporary connection for the delete to ensure commit
                temp_con = duckdb.connect('data/quant.duckdb')
                try:
                    temp_con.execute(f"DELETE FROM ticker_aliases WHERE source_symbol = '{source}'")
                    temp_con.execute(f"DELETE FROM stock_list_fmp WHERE symbol = '{source}'")
                    temp_con.close()
                except: pass
                
                # B. Restore via Client (uses its own connection)
                source_meta = fmp_stocks[fmp_stocks['symbol'] == source].copy()
                client._db_manager.upsert_stock_list(source_meta)
                
                logger.success(f"🔓 Un-stitched {source} from {master}. It will be resynced as a separate asset.")
                repaired_count += 1
            else:
                logger.info(f"✅ Verified: {source} -> {master} appears to be a legitimate name change/delisting.")

        logger.success(f"🛠️ Repair complete. {repaired_count} share classes separated.")
        
    except Exception as e:
        logger.error(f"Repair failed: {e}")
    finally:
        con.close()

if __name__ == "__main__":
    repair_stitching()
