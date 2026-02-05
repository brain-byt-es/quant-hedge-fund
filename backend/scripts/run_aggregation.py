import sys
import os
from loguru import logger

# Ensure backend is in path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from api.routers.data import get_qs_client

def run_standalone_aggregation():
    logger.info("🚀 Starting Standalone Market Taxonomy Aggregation...")
    
    try:
        client = get_qs_client()
        db = client._db_manager
        con = db.connect()
        
        # 1. Clear existing stats
        logger.info("Cleaning old stats...")
        con.execute("DELETE FROM sector_industry_stats")
        
        # 2. Aggregate Industries
        # We join master_assets_index with prices to get actual Market Cap
        # master_assets_index has: symbol, category, country, market_cap (string)
        # historical_prices_fmp has: symbol, close, volume
        logger.info("Aggregating Industries...")
        con.execute("""
            INSERT INTO sector_industry_stats
            SELECT 
                category as name,
                'industry' as group_type,
                COUNT(*) as stock_count,
                SUM(price_data.market_cap) as market_cap,
                AVG(15.0) as avg_pe, -- Placeholder
                AVG(0.02) as avg_dividend_yield, -- Placeholder
                AVG(0.10) as avg_profit_margin, -- Placeholder
                AVG(price_data.change_p) as perf_1d,
                0.0 as perf_1w,
                0.0 as perf_1m,
                0.0 as perf_1y,
                CURRENT_TIMESTAMP as updated_at
            FROM master_assets_index m
            JOIN (
                SELECT 
                    symbol, 
                    MAX(close) as price,
                    MAX(change_percent) as change_p,
                    -- Mocking market cap as price * fixed shares if real mcap missing
                    -- In reality, we'd use a real mcap column
                    MAX(volume * close) as market_cap 
                FROM historical_prices_fmp 
                GROUP BY symbol
            ) price_data ON m.symbol = price_data.symbol
            WHERE m.type = 'Equity' AND m.category IS NOT NULL AND m.category != ''
            GROUP BY category
        """)
        
        # 3. Aggregate Sectors
        logger.info("Aggregating Sectors...")
        con.execute("""
            INSERT INTO sector_industry_stats
            SELECT 
                split_part(category, ' - ', 1) as name,
                'sector' as group_type,
                COUNT(*) as stock_count,
                SUM(price_data.market_cap) as market_cap,
                AVG(15.0) as avg_pe,
                AVG(0.02) as avg_dividend_yield,
                AVG(0.10) as avg_profit_margin,
                AVG(price_data.change_p) as perf_1d,
                0.0 as perf_1w,
                0.0 as perf_1m,
                0.0 as perf_1y,
                CURRENT_TIMESTAMP as updated_at
            FROM master_assets_index m
            JOIN (
                SELECT 
                    symbol, 
                    MAX(volume * close) as market_cap,
                    MAX(change_percent) as change_p
                FROM historical_prices_fmp 
                GROUP BY symbol
            ) price_data ON m.symbol = price_data.symbol
            WHERE m.type = 'Equity' AND m.category IS NOT NULL AND m.category != ''
            GROUP BY 1
        """)
        
        count = con.execute("SELECT COUNT(*) FROM sector_industry_stats").fetchone()[0]
        logger.success(f"✅ Aggregation complete: {count} groups processed.")
        
    except Exception as e:
        logger.exception(f"Aggregation failed: {e}")
    finally:
        try: con.close()
        except: pass

if __name__ == "__main__":
    run_standalone_aggregation()
