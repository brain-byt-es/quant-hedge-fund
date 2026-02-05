import sys
import os
from loguru import logger

# Ensure backend is in path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from api.routers.data import get_qs_client

def update_top_funds():
    logger.info("🚀 Updating Top Hedge Funds with Real Stats...")
    
    try:
        client = get_qs_client()
        db = client._db_manager
        con = db.connect()
        
        # Hardcoded data from research.py
        top_funds = [
            {"cik": "0001067983", "name": "Berkshire Hathaway Inc", "manager": "Warren Buffett", "portfolio_value": 267300000000, "top_holdings": "GOOGL,AMZN,ALLY", "strategy": "Value", "success_rate": 95.0, "rank": 1},
            {"cik": "0001037389", "name": "Renaissance Technologies LLC", "manager": "Jim Simons", "portfolio_value": 75800000000, "top_holdings": "TXG,SRCE,ETNB", "strategy": "Quantitative", "success_rate": 94.0, "rank": 2},
            {"cik": "0001423053", "name": "Citadel Advisors LLC", "manager": "Ken Griffin", "portfolio_value": 98100000000, "top_holdings": "MSFT,GOOGL,NVDA", "strategy": "Multi-Strategy", "success_rate": 93.0, "rank": 3},
            {"cik": "0001350694", "name": "Bridgewater Associates", "manager": "Ray Dalio", "portfolio_value": 124500000000, "top_holdings": "PG,JNJ,KO", "strategy": "Macro", "success_rate": 92.0, "rank": 4},
            {"cik": "0001336528", "name": "Pershing Square Capital", "manager": "Bill Ackman", "portfolio_value": 10200000000, "top_holdings": "CMG,HLT,LOW", "strategy": "Activist", "success_rate": 91.0, "rank": 5},
            {"cik": "0001006438", "name": "Appaloosa Management", "manager": "David Tepper", "portfolio_value": 5400000000, "top_holdings": "NVDA,META,MSFT", "strategy": "Value / Tech", "success_rate": 90.0, "rank": 6},
            {"cik": "0001649339", "name": "Scion Asset Management", "manager": "Michael Burry", "portfolio_value": 200000000, "top_holdings": "BABA,JD,SPY", "strategy": "Contrarian", "success_rate": 89.0, "rank": 7},
            {"cik": "0001691493", "name": "ARK Investment Management", "manager": "Cathie Wood", "portfolio_value": 14200000000, "top_holdings": "TSLA,COIN,ROKU", "strategy": "Innovation", "success_rate": 88.0, "rank": 8},
            {"cik": "0001603466", "name": "Point72 Asset Management", "manager": "Steve Cohen", "portfolio_value": 34100000000, "top_holdings": "NVDA,AMZN,MSFT", "strategy": "L/S Equity", "success_rate": 87.0, "rank": 9},
            {"cik": "0001167483", "name": "Tiger Global Management", "manager": "Chase Coleman", "portfolio_value": 12800000000, "top_holdings": "META,AMZN,MSFT", "strategy": "Growth", "success_rate": 86.0, "rank": 10}
        ]
        
        for fund in top_funds:
            logger.info(f"Updating {fund['name']}...")
            # We use an UPDATE statement
            con.execute(f"""
                UPDATE institutional_filers
                SET 
                    name = '{fund['name']}',
                    manager = '{fund['manager']}',
                    portfolio_value = {fund['portfolio_value']},
                    top_holdings = '{fund['top_holdings']}',
                    strategy = '{fund['strategy']}',
                    success_rate = {fund['success_rate']},
                    rank = {fund['rank']}
                WHERE cik = '{fund['cik']}'
            """)
            
        logger.success("✅ Top funds updated.")

    except Exception as e:
        logger.exception(f"Update Error: {e}")

if __name__ == "__main__":
    update_top_funds()
