import sys
import os
import requests
import pandas as pd
from loguru import logger
from tqdm import tqdm
import time
from datetime import datetime

# Ensure backend is in path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from api.routers.data import get_qs_client

def ingest_fund_holdings(top_n: int = 100):
    logger.info(f"🚀 Starting Paginated Ingestion of Holdings for Top {top_n} Funds...")
    
    try:
        client = get_qs_client()
        db = client._db_manager
        
        # 1. Get Top Funds from DB
        # If portfolio_value is 0, we'll still try the first N
        funds = client.query(f"""
            SELECT cik, name, portfolio_value 
            FROM institutional_filers 
            ORDER BY portfolio_value DESC, name ASC
            LIMIT {top_n}
        """).to_dicts()
        
        if not funds:
            logger.warning("No funds found. Run 'ingest_hedge_funds.py' first.")
            return

        con = db.connect()
        total_positions_added = 0
        
        for fund in tqdm(funds, desc="Processing Funds"):
            cik = fund['cik']
            fund_name = fund['name']
            
            try:
                # 2. Get Latest Filing Header
                header_url = f"https://forms13f.com/api/v1/forms?cik={cik}&limit=1"
                h_res = requests.get(header_url, timeout=10)
                if h_res.status_code != 200:
                    continue
                
                filings = h_res.json()
                if not filings:
                    continue
                
                filing = filings[0]
                acc_num = filing.get("accession_number")
                report_date = filing.get("period_of_report")
                total_val = filing.get("table_value_total", 0)
                
                if not acc_num:
                    continue

                # Update parent table stats
                if total_val > 0:
                    con.execute(f"UPDATE institutional_filers SET portfolio_value = {total_val}, last_report_date = '{report_date}' WHERE cik = '{cik}'")

                # 3. Paginate Holdings
                hold_limit = 100
                hold_offset = 0
                fund_positions = 0
                
                while True:
                    holdings_url = f"https://forms13f.com/api/v1/form?accession_number={acc_num}&cik={cik}&limit={hold_limit}&offset={hold_offset}"
                    ho_res = requests.get(holdings_url, timeout=15)
                    
                    if ho_res.status_code != 200:
                        logger.error(f"Error {ho_res.status_code} for {fund_name} at offset {hold_offset}")
                        break
                        
                    data = ho_res.json()
                    if not data:
                        break
                    
                    rows = []
                    for item in data:
                        ticker = item.get("ticker")
                        if not ticker: continue
                        
                        val = item.get("value", 0)
                        weight = (val / total_val * 100) if total_val else 0
                        
                        rows.append({
                            "accession_number": acc_num,
                            "cik": cik,
                            "symbol": ticker,
                            "name": item.get("name_of_issuer", "Unknown"),
                            "shares": item.get("ssh_prnamt", 0),
                            "value": val,
                            "type": item.get("put_call", "Long") or "Long",
                            "weight": round(weight, 4),
                            "date": report_date
                        })
                    
                    if rows:
                        df = pd.DataFrame(rows)
                        df["updated_at"] = datetime.now()
                        
                        con.register('df_holdings', df)
                        con.execute("""
                            INSERT OR REPLACE INTO institutional_portfolio_holdings 
                            (accession_number, cik, symbol, name, shares, value, type, weight, date, updated_at)
                            SELECT accession_number, cik, symbol, name, shares, value, type, weight, date, updated_at 
                            FROM df_holdings
                        """)
                        con.unregister('df_holdings')
                        
                        fund_positions += len(rows)
                        total_positions_added += len(rows)
                    
                    if len(data) < hold_limit:
                        break
                        
                    hold_offset += hold_limit
                    time.sleep(0.05) # Tiny sleep between pages
                
                # logger.info(f"Ingested {fund_positions} positions for {fund_name}")
                
            except Exception as e:
                logger.error(f"Error processing {fund_name}: {e}")
                continue

        logger.success(f"✅ Ingestion Complete. Total Positions: {total_positions_added}")
        
    except Exception as e:
        logger.exception(f"Critical Error: {e}")

if __name__ == "__main__":
    # Start with top 50 to ensure success, can increase later
    ingest_fund_holdings(top_n=50)