from pathlib import Path
from loguru import logger
from qsconnect.database.remote_writer import RemoteWriter

def check_mismatches():
    # Use RemoteWriter to avoid DuckDB lock conflicts
    writer = RemoteWriter()

    logger.info("🔍 Analyzing Ticker Mismatches via CIK (Unified Mode)...")

    try:
        # 1. Find CIKs associated with multiple symbols
        sql_duplicates = """
            WITH cik_counts AS (
                SELECT cik, COUNT(DISTINCT symbol) as symbol_count
                FROM stock_list_fmp
                WHERE cik IS NOT NULL AND cik != '' AND cik != 'None'
                GROUP BY cik
                HAVING COUNT(DISTINCT symbol) > 1
            )
            SELECT 
                s.cik, 
                s.symbol, 
                s.name, 
                s.exchange,
                (SELECT COUNT(*) FROM historical_prices_fmp p WHERE p.symbol = s.symbol) as price_count,
                (SELECT MIN(date) FROM historical_prices_fmp p WHERE p.symbol = s.symbol) as first_date,
                (SELECT MAX(date) FROM historical_prices_fmp p WHERE p.symbol = s.symbol) as last_date
            FROM stock_list_fmp s
            JOIN cik_counts c ON s.cik = c.cik
            ORDER BY s.cik, s.symbol
        """

        df = writer.query(sql_duplicates)

        if df.is_empty():
            logger.success("✅ No CIK duplicates found! All symbols are uniquely identified.")
            return

        logger.warning(f"⚠️ Found {df['cik'].n_unique()} companies with multiple tickers.")

        # Display the report
        print("\n" + "="*80)
        print(f"{'CIK':12} | {'Symbol':8} | {'Prices':8} | {'Start':10} | {'End':10} | {'Name'}")
        print("-" * 80)

        for row in df.iter_rows(named=True):
            price_str = f"{row['price_count']:,}"
            first = str(row['first_date']) if row['first_date'] else "N/A"
            last = str(row['last_date']) if row['last_date'] else "N/A"
            print(f"{row['cik']:12} | {row['symbol']:8} | {price_str:8} | {first:10} | {last:10} | {row['name']}")
        print("="*80)

    except Exception as e:
        logger.error(f"Analysis failed: {e}")

if __name__ == "__main__":
    check_mismatches()
