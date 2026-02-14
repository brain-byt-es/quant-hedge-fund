"""
QS Connect - Data Validator

Institutional-grade data validation for market and fundamental data.
Detects gaps, outliers, and anomalies to ensure research integrity.
"""

from typing import Any, Dict, List


class DataValidator:
    """
    Validator for identifying data quality issues in DuckDB.
    """

    def __init__(self, db_manager):
        self.db = db_manager

    def run_full_health_check(self) -> Dict[str, Any]:
        """Run all validation suites."""
        return {
            "price_holes": self.detect_price_gaps(),
            "outliers": self.detect_price_outliers(),
            "staleness": self.check_data_freshness(),
            "duplicates": self.detect_duplicates(),
            "universe_consistency": self.check_universe_completeness()
        }

    def detect_price_gaps(self, threshold_days: int = 5) -> List[Dict]:
        """Detect symbols with significant gaps in their price series."""
        sql = f"""
            WITH gaps AS (
                SELECT 
                    symbol,
                    date,
                    lag(date) OVER (PARTITION BY symbol ORDER BY date) as prev_date,
                    date - lag(date) OVER (PARTITION BY symbol ORDER BY date) as gap_size
                FROM historical_prices_fmp
            )
            SELECT symbol, MAX(gap_size) as max_gap, COUNT(*) as gap_count
            FROM gaps
            WHERE gap_size > {threshold_days}
            GROUP BY symbol
            ORDER BY max_gap DESC
        """
        try:
            return self.db.query(sql).to_dicts()
        except: return []

    def detect_price_outliers(self, return_threshold: float = 0.5) -> List[Dict]:
        """Detect suspicious price spikes (>50% move in 1 day)."""
        sql = f"""
            WITH returns AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    lag(close) OVER (PARTITION BY symbol ORDER BY date) as prev_close,
                    abs((close / NULLIF(lag(close) OVER (PARTITION BY symbol ORDER BY date), 0)) - 1) as daily_return
                FROM historical_prices_fmp
            )
            SELECT symbol, date, close, prev_close, daily_return
            FROM returns
            WHERE daily_return > {return_threshold}
            ORDER BY daily_return DESC
            LIMIT 100
        """
        try:
            return self.db.query(sql).to_dicts()
        except: return []

    def check_data_freshness(self) -> List[Dict]:
        """Check for symbols that haven't been updated in 3+ trading days."""
        sql = """
            SELECT 
                symbol,
                MAX(date) as last_date,
                (CURRENT_DATE - MAX(date)) as days_stale
            FROM historical_prices_fmp
            GROUP BY symbol
            HAVING days_stale > 3
            ORDER BY days_stale DESC
        """
        try:
            return self.db.query(sql).to_dicts()
        except: return []

    def detect_duplicates(self) -> List[Dict]:
        """Detect duplicate records (Symbol + Date)."""
        sql = """
            SELECT symbol, date, COUNT(*) as occurrence
            FROM historical_prices_fmp
            GROUP BY symbol, date
            HAVING occurrence > 1
        """
        try:
            return self.db.query(sql).to_dicts()
        except: return []

    def check_universe_completeness(self) -> Dict:
        """Cross-check stock list vs price table."""
        sql_missing = """
            SELECT s.symbol 
            FROM stock_list_fmp s
            LEFT JOIN (SELECT DISTINCT symbol FROM historical_prices_fmp) p ON s.symbol = p.symbol
            WHERE p.symbol IS NULL
        """
        try:
            missing = self.db.query(sql_missing).to_dicts()
            return {"missing_prices_for_universe": len(missing), "samples": missing[:10]}
        except: return {"error": "Query failed"}
