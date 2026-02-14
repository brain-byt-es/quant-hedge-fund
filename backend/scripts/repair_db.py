from pathlib import Path

import duckdb
from loguru import logger

db_path = Path("/Users/henrik/Documents/VS Code/QuantHedgeFond/app/data/quant.duckdb")

def repair_database():
    logger.info(f"Connecting to {db_path} for repair...")
    con = duckdb.connect(str(db_path))

    try:
        # 1. Fix Country Mappings based on Ticker Suffixes
        logger.info("Fixing country mappings...")
        suffix_map = {
            '.SZ': 'China',
            '.SS': 'China',
            '.HK': 'Hong Kong',
            '.KS': 'South Korea',
            '.KQ': 'South Korea',
            '.DE': 'Germany',
            '.F': 'Germany',
            '.SG': 'Germany',
            '.L': 'United Kingdom',
            '.PA': 'France',
            '.TO': 'Canada',
            '.V': 'Canada',
            '.AX': 'Australia',
            '.KL': 'Malaysia',
            '.NS': 'India',
            '.BO': 'India',
            '.MI': 'Italy',
            '.MC': 'Spain',
            '.SA': 'Brazil',
            '.JO': 'South Africa',
            '.T': 'Japan'
        }

        for suffix, country in suffix_map.items():
            con.execute(f"UPDATE master_assets_index SET country = '{country}' WHERE symbol LIKE '%{suffix}'")

        # 2. Fix placeholder names ("one", "two")
        logger.info("Cleaning up placeholder names...")
        con.execute("UPDATE master_assets_index SET name = symbol WHERE name IN ('one', 'two', 'Unknown', 'N/A')")

        # 3. Force US stocks to United States if they have no suffix and are on major exchanges
        con.execute("UPDATE master_assets_index SET country = 'United States' WHERE country = 'Global' AND (exchange LIKE '%NASDAQ%' OR exchange LIKE '%NYSE%')")

        # 4. Verify some data
        res = con.execute("SELECT symbol, name, country FROM master_assets_index WHERE symbol LIKE '%.SZ' LIMIT 5").to_df()
        logger.info("Verify SZ stocks:\n" + str(res))

        logger.success("Database repair complete.")
    except Exception as e:
        logger.error(f"Repair failed: {e}")
    finally:
        con.close()

if __name__ == "__main__":
    repair_database()
