
from qsconnect import Client
import time

def force_update():
    print("Force Aggregating Taxonomy...")
    client = Client()
    con = client._db_manager.connect()
    
    try:
        # 1. Performance Table - Filter out NaNs immediately
        con.execute("DROP TABLE IF EXISTS asset_perf_working")
        con.execute("""
            CREATE TABLE asset_perf_working AS
            WITH p AS (
                SELECT symbol, date, close,
                       row_number() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM (SELECT symbol, date, AVG(close) as close FROM historical_prices_fmp GROUP BY 1, 2)
            ),
            p0 AS (SELECT symbol, close FROM p WHERE rn = 1),
            p1 AS (SELECT symbol, close FROM p WHERE rn = 2),
            py AS (
                SELECT symbol, close FROM historical_prices_fmp
                WHERE date <= (CURRENT_DATE - INTERVAL 360 DAY)
                QUALIFY row_number() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
            ),
            raw_perf AS (
                SELECT 
                    trim(p0.symbol) as symbol,
                    CAST(((p0.close / NULLIF(p1.close, 0)) - 1.0) * 100.0 AS DOUBLE) as r1d,
                    CAST(((p0.close / NULLIF(py.close, 0)) - 1.0) * 100.0 AS DOUBLE) as r1y
                FROM p0
                LEFT JOIN p1 ON p0.symbol = p1.symbol
                LEFT JOIN py ON p0.symbol = py.symbol
            )
            SELECT symbol, 
                   CASE WHEN isfinite(r1d) THEN r1d ELSE NULL END as ret_1d,
                   CASE WHEN isfinite(r1y) THEN r1y ELSE NULL END as ret_1y
            FROM raw_perf
            WHERE isfinite(r1d) OR isfinite(r1y)
        """)
        print("Performance metrics calculated and sanitized.")

        # 2. Stats Table
        con.execute("DROP TABLE IF EXISTS sector_industry_stats")
        con.execute("""
            CREATE TABLE sector_industry_stats (
                name VARCHAR, group_type VARCHAR, stock_count INTEGER,
                market_cap DOUBLE, total_revenue DOUBLE, avg_pe DOUBLE,
                avg_dividend_yield DOUBLE, avg_profit_margin DOUBLE,
                perf_1d DOUBLE, perf_1w DOUBLE, perf_1m DOUBLE, perf_1y DOUBLE,
                updated_at TIMESTAMP
            )
        """)

        # 3. Insert - Using COALESCE(AVG(...), 0.0) to avoid NaNs at the group level
        for col, gtype in [('industry', 'industry'), ('sector', 'sector')]:
            sql = f"""
                INSERT INTO sector_industry_stats
                SELECT 
                    s.{col} as name,
                    '{gtype}' as group_type,
                    COUNT(s.symbol) as stock_count,
                    CAST(SUM(COALESCE(m.market_cap, s.price * 1000000, 0)) AS DOUBLE) as market_cap,
                    CAST(SUM(COALESCE(i.revenue, 0)) AS DOUBLE) as total_revenue,
                    CAST(MEDIAN(NULLIF(r.priceToEarningsRatio, 0)) AS DOUBLE) as avg_pe,
                    CAST(AVG(NULLIF(r.dividendYield, 0)) AS DOUBLE) as avg_dividend_yield,
                    CAST(AVG(NULLIF(r.netProfitMargin, 0)) AS DOUBLE) as avg_profit_margin,
                    CAST(COALESCE(AVG(p.ret_1d), 0.0) AS DOUBLE) as perf_1d,
                    0.0, 0.0, 
                    CAST(COALESCE(AVG(p.ret_1y), 0.0) AS DOUBLE) as perf_1y, 
                    CURRENT_TIMESTAMP 
                FROM stock_list_fmp s 
                LEFT JOIN factor_ranks_snapshot m ON s.symbol = m.symbol 
                LEFT JOIN asset_perf_working p ON trim(s.symbol) = trim(p.symbol) 
                LEFT JOIN (
                    SELECT symbol, revenue FROM bulk_income_quarter_fmp 
                    QUALIFY row_number() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
                ) i ON s.symbol = i.symbol
                LEFT JOIN (
                    SELECT symbol, priceToEarningsRatio, dividendYield, netProfitMargin FROM bulk_ratios_annual_fmp 
                    QUALIFY row_number() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
                ) r ON s.symbol = r.symbol
                WHERE s.{col} IS NOT NULL AND s.{col} != ''
                GROUP BY s.{col}
            """
            con.execute(sql)
            print(f"Aggregated {gtype}.")

        count = con.execute("SELECT COUNT(*) FROM sector_industry_stats").fetchone()[0]
        print(f"Total rows: {count}")
        
    finally:
        con.execute("DROP TABLE IF EXISTS asset_perf_working")
        con.close()

if __name__ == "__main__":
    force_update()
