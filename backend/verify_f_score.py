import os
import sys

import duckdb

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config.settings import get_settings


def verify_symbol(symbol: str):
    settings = get_settings()
    conn = duckdb.connect(str(settings.duckdb_path), read_only=True)

    print(f"\n=== F-Score Audit: {symbol} ===")

    # Get the raw metrics and scores from our snapshot
    res = conn.execute(f"SELECT * FROM factor_ranks_snapshot WHERE symbol = '{symbol}'").df()
    if res.empty:
        print("Symbol not found in snapshot.")
        return

    f_score = res['f_score'].iloc[0]
    print(f"Total F-Score: {f_score}/9")
    print("-" * 30)

    # Now let's see the underlying data from the latest and 1-year-ago quarters
    sql = f"""
    WITH Fundamentals AS (
        SELECT 
            i.symbol, i.date, i."Net Income" as ni, i."Revenue" as rev, 
            b."Total Assets" as assets, b."Long Term Debt" as debt,
            b."Total Current Assets" as ca, b."Total Current Liabilities" as cl,
            c."Net Cash from Operating Activities" as cfo,
            i."Shares (Basic)" as shares, i."Gross Profit" as gp
        FROM bulk_income_quarter_fmp i
        JOIN bulk_balance_quarter_fmp b ON i.symbol = b.symbol AND i.date = b.date
        JOIN bulk_cashflow_quarter_fmp c ON i.symbol = c.symbol AND i.date = c.date
        WHERE i.symbol = '{symbol}'
        ORDER BY i.date DESC
        LIMIT 5
    )
    SELECT 
        date, ni, rev, assets, debt, ca, cl, cfo, shares, gp,
        ni / NULLIF(assets, 0) as roa,
        ca / NULLIF(cl, 0) as curr_ratio,
        gp / NULLIF(rev, 0) as margin,
        rev / NULLIF(assets, 0) as turnover,
        debt / NULLIF(assets, 0) as leverage
    FROM Fundamentals
    """
    data = conn.execute(sql).df()

    if len(data) < 5:
        print("Warning: Insufficient history for full YoY audit (need at least 5 quarters).")

    # Compare row 0 (Current) with row 4 (YoY)
    curr = data.iloc[0]
    prev = data.iloc[4] if len(data) >= 5 else None

    print(f"Comparison: {curr['date']} vs {prev['date'] if prev is not None else 'N/A'}")

    criteria = [
        ("1. ROA > 0", curr['ni'] > 0),
        ("2. CFO > 0", curr['cfo'] > 0),
        ("3. Delta ROA > 0", prev is not None and curr['roa'] > prev['roa']),
        ("4. Accruals (CFO > NI)", curr['cfo'] > curr['ni']),
        ("5. Delta Leverage < 0", prev is not None and curr['leverage'] <= prev['leverage']),
        ("6. Delta Liquidity > 0", prev is not None and curr['curr_ratio'] >= prev['curr_ratio']),
        ("7. No Dilution", prev is not None and curr['shares'] <= prev['shares']),
        ("8. Delta Margin > 0", prev is not None and curr['margin'] >= prev['margin']),
        ("9. Delta Turnover > 0", prev is not None and curr['turnover'] >= prev['turnover'])
    ]

    for label, passed in criteria:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{label:<25} : {status}")

if __name__ == "__main__":
    # Test with a symbol from your list
    import sys
    sym = sys.argv[1] if len(sys.argv) > 1 else "AAPL"
    verify_symbol(sym)
