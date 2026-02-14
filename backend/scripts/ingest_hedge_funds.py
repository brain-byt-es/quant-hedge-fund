import os
import sys
import time

import pandas as pd
import requests
from loguru import logger
from tqdm import tqdm

# Ensure backend is in path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from api.routers.data import get_qs_client


def ingest_hedge_funds():
    logger.info("🚀 Starting Hedge Fund Ingestion from forms13f.com...")

    try:
        client = get_qs_client()
        db = client._db_manager

        base_url = "https://forms13f.com/api/v1/filers"
        limit = 100
        offset = 0
        total_ingested = 0

        # Create a progress bar (unknown total initially, but we can guess ~7500)
        pbar = tqdm(total=8000, desc="Ingesting Filers", unit="filers")

        while True:
            try:
                url = f"{base_url}?offset={offset}&limit={limit}"
                # logger.debug(f"Fetching {url}")

                res = requests.get(url, timeout=15)
                if res.status_code != 200:
                    logger.error(f"Failed to fetch batch at offset {offset}: {res.status_code}")
                    # If we hit a limit error or similar, maybe just break
                    break

                data = res.json()
                if not data:
                    logger.info("Received empty batch. Ingestion complete.")
                    break

                rows = []
                for item in data:
                    # Handle potential missing or list-based names
                    names = item.get("company_names", [])
                    name = names[0] if names and isinstance(names, list) else "Unknown"

                    rows.append({
                        "cik": item.get("cik"),
                        "name": name,
                        "manager": "Institutional Manager",
                        "portfolio_value": 0.0,
                        "top_holdings": "",
                        "strategy": "Long-Term Equity",
                        "success_rate": 0.0,
                        "rank": 9999
                    })

                if rows:
                    df = pd.DataFrame(rows)

                    con = db.connect()
                    con.register('df_batch', df)
                    # Explicit column mapping to match schema:
                    # cik, name, manager, portfolio_value, top_holdings, strategy, success_rate, rank, last_report_date, updated_at
                    con.execute("""
                        INSERT OR IGNORE INTO institutional_filers 
                        (cik, name, manager, portfolio_value, top_holdings, strategy, success_rate, rank, last_report_date, updated_at)
                        SELECT 
                            cik, 
                            name, 
                            manager, 
                            portfolio_value, 
                            top_holdings, 
                            strategy, 
                            success_rate, 
                            rank, 
                            NULL as last_report_date,
                            CURRENT_TIMESTAMP as updated_at 
                        FROM df_batch
                    """)
                    con.unregister('df_batch')

                    count = len(rows)
                    total_ingested += count
                    pbar.update(count)
                    offset += limit

                    # Be nice to the API
                    time.sleep(0.1)
                else:
                    break

            except Exception as e:
                logger.error(f"Error processing batch at offset {offset}: {e}")
                break

        pbar.close()
        logger.success(f"✅ Successfully ingested {total_ingested} hedge funds into 'institutional_filers'.")

        # Verify count
        res = client.query("SELECT COUNT(*) as count FROM institutional_filers")
        final_count = res.to_dicts()[0]['count']
        logger.info(f"Total rows in DB: {final_count}")

    except Exception as e:
        logger.exception(f"Critical Ingestion Error: {e}")

if __name__ == "__main__":
    ingest_hedge_funds()
