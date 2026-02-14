import duckdb
import polars as pl

def debug_aggregation():
    # DIRECT connection to avoid manager locks
    db_path = "/Users/henrik/Documents/VS Code/QuantHedgeFond/app/data/quant.duckdb"
    con = duckdb.connect(database=db_path, read_only=True)
    
    print("--- 1. Checking Raw Price Counts ---")
    prices_count = con.execute("SELECT COUNT(*) FROM historical_prices_fmp").fetchone()[0]
    print(f"Total prices: {prices_count}")

    print("\n--- 2. Checking Symbol Match counts ---")
    match_count = con.execute("""
        SELECT COUNT(DISTINCT s.symbol) 
        FROM stock_list_fmp s 
        JOIN historical_prices_fmp p ON s.symbol = p.symbol
    """).fetchone()[0]
    print(f"Symbols with both metadata and prices: {match_count}")

    print("\n--- 3. Running Performance Calculation (Simulated) ---")
    check_sql = """
        WITH distinct_p AS (
            SELECT symbol, date, AVG(close) as close
            FROM historical_prices_fmp
            GROUP BY 1, 2
        ),
        p_ranked AS (
            SELECT symbol, date, close,
                   row_number() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
            FROM distinct_p
        ),
        p0 AS (SELECT symbol, close FROM p_ranked WHERE rn = 1),
        p1 AS (SELECT symbol, close FROM p_ranked WHERE rn = 2),
        perf AS (
            SELECT p0.symbol, ((p0.close / NULLIF(p1.close, 0)) - 1.0) * 100.0 as ret_1d
            FROM p0 JOIN p1 ON p0.symbol = p1.symbol
        )
        SELECT COUNT(*) as symbols_with_perf, COUNT(CASE WHEN ret_1d != 0 THEN 1 END) as non_zero_returns
        FROM perf
    """
    res = con.execute(check_sql).fetchone()
    print(f"Matched symbols for perf: {res[0]}, Non-zero returns: {res[1]}")

    print("\n--- 4. Checking Healthcare Sector Specifically ---")
    sector_sql = """
        WITH distinct_p AS (
            SELECT symbol, date, AVG(close) as close
            FROM historical_prices_fmp
            GROUP BY 1, 2
        ),
        p_ranked AS (
            SELECT symbol, date, close,
                   row_number() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
            FROM distinct_p
        ),
        p0 AS (SELECT symbol, close FROM p_ranked WHERE rn = 1),
        p1 AS (SELECT symbol, close FROM p_ranked WHERE rn = 2),
        perf AS (
            SELECT p0.symbol, ((p0.close / NULLIF(p1.close, 0)) - 1.0) * 100.0 as ret_1d
            FROM p0 JOIN p1 ON p0.symbol = p1.symbol
        )
        SELECT s.sector, COUNT(p.symbol) as matched_stocks, AVG(p.ret_1d) as avg_ret
        FROM stock_list_fmp s
        LEFT JOIN perf p ON trim(s.symbol) = trim(p.symbol)
        WHERE s.sector = 'Healthcare'
        GROUP BY 1
    """
    sector_check = con.execute(sector_sql).pl()
    print(sector_check)

    con.close()

if __name__ == "__main__":
    debug_aggregation()