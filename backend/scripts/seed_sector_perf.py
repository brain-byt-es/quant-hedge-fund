import sys
import os
import pandas as pd
from loguru import logger

# Ensure backend is in path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from api.routers.data import get_qs_client

def seed_sector_performance():
    logger.info("🌱 Seeding Sector Performance from FMP...")
    
    try:
        client = get_qs_client()
        fmp = client._fmp_client
        db = client._db_manager
        
        # 1. Get Sector Performance from FMP
        df = fmp.get_sector_performance()
        if df.empty:
            logger.warning("FMP returned no sector performance data.")
            return

        con = db.connect()
        try:
            # Map FMP Sector Names to our schema names
            # FMP Names: "Technology", "Financial Services", "Energy", etc.
            # Our Names usually match or are substrings
            
            for _, row in df.iterrows():
                sector_name = row['sector']
                perf = float(row['changesPercentage'].replace('%', ''))
                
                # Update broad sectors in our stats table
                # We use ILIKE to match "Financial Services" with "Financials" etc.
                con.execute(f"""
                    UPDATE sector_industry_stats 
                    SET perf_1d = {perf} 
                    WHERE group_type = 'sector' 
                    AND (name ILIKE '%{sector_name}%' OR '{sector_name}' ILIKE '%' || name || '%')
                """)
                
                # Also update sub-industries starting with that sector name
                con.execute(f"""
                    UPDATE sector_industry_stats 
                    SET perf_1d = {perf} 
                    WHERE group_type = 'industry' 
                    AND name ILIKE '{sector_name}%'
                """)
                
            logger.success("✅ Sector performance seeded successfully.")
        finally:
            con.close()
            
    except Exception as e:
        logger.error(f"Seeding failed: {e}")

if __name__ == "__main__":
    seed_sector_performance()
