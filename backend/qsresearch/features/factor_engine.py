"""
Factor Engine - The "Quant DNA" Calculator
Calculates cross-sectional rankings (Percentiles) for Value, Quality, Growth, Momentum, and Safety.
"""

from typing import Dict, Any, List
import duckdb
import polars as pl
from loguru import logger
from config.settings import get_settings

class FactorEngine:
    def __init__(self, db_mgr=None):
        self.settings = get_settings()
        if db_mgr:
            self.db_mgr = db_mgr
        else:
            from qsconnect.database.duckdb_manager import DuckDBManager
            self.db_mgr = DuckDBManager(self.settings.duckdb_path, read_only=False)

    def calculate_universe_ranks(self) -> int:
        """
        Calculates percentile ranks for the entire universe across 5 factors.
        Stores the result in `factor_ranks_snapshot`.
        """
        logger.info("Starting Factor Engine: Calculating Universe Ranks...")
        
        # 1. Prepare Base View (Combine Industries & Latest Prices)
        # We need to unite Normal, Banks, Insurance fundamentals
        # And join with the latest price for valuation ratios
        
        try:
            conn = self.db_mgr.connect()
            
            # Reset Snapshot Table (Schema might change)
            conn.execute("DROP TABLE IF EXISTS factor_ranks_snapshot")
            
            # Create Snapshot Table if not exists
            conn.execute("""
                CREATE TABLE IF NOT EXISTS factor_ranks_snapshot (
                    symbol VARCHAR PRIMARY KEY,
                    as_of DATE,
                    
                    -- Raw Metrics (for transparency)
                    raw_momentum DOUBLE,
                    raw_roe DOUBLE,
                    raw_growth DOUBLE,
                    raw_earnings_yield DOUBLE,
                    raw_volatility DOUBLE,
                    
                    -- Scores
                    momentum_score DOUBLE,
                    quality_score DOUBLE,
                    growth_score DOUBLE,
                    value_score DOUBLE,
                    safety_score DOUBLE,
                    f_score INTEGER, -- Piotroski-style Score (0-5)
                    
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # The Mega-Query
            sql = """
            INSERT OR REPLACE INTO factor_ranks_snapshot
            WITH 
            -- A. Latest Prices & Momentum
            LatestPrices AS (
                SELECT symbol, close as price_now, date as date_now
                FROM historical_prices_fmp
                WHERE date = (SELECT MAX(date) FROM historical_prices_fmp)
            ),
            PastPrices AS (
                SELECT symbol, close as price_12m
                FROM historical_prices_fmp
                WHERE date = (SELECT MAX(date) FROM historical_prices_fmp WHERE date <= CURRENT_DATE - INTERVAL 365 DAY)
            ),
            Volatility AS (
                SELECT symbol, stddev(change_percent) * 15.87 as vola_90d 
                FROM historical_prices_fmp
                WHERE date >= CURRENT_DATE - INTERVAL 90 DAY
                GROUP BY symbol
            ),
            
            -- B. Unified Fundamentals (Most recent quarter)
                        Fundamentals AS (
                            -- Normal
                            SELECT 
                                i.symbol, 
                                i."Net Income" as net_income, 
                                i."Revenue" as revenue, 
                                b."Total Equity" as equity,
                                c."Net Cash from Operating Activities" as op_cashflow,
                                i.date as report_date
                            FROM bulk_income_quarter_fmp i
                                            JOIN bulk_balance_quarter_fmp b ON i.symbol = b.symbol AND i.date = b.date
                                            JOIN bulk_cashflow_quarter_fmp c ON i.symbol = c.symbol AND i.date = c.date
                                            WHERE i.date > CURRENT_DATE - INTERVAL 500 DAY
                                            
                                            UNION ALL
                                            
                                            -- Banks
                                            SELECT 
                                                i.symbol, 
                                                i."Net Income" as net_income, 
                                                i."Revenue" as revenue, 
                                                b."Total Equity" as equity,
                                                c."Net Cash from Operating Activities" as op_cashflow,
                                                i.date as report_date
                                            FROM bulk_income_banks_quarter_fmp i
                                            JOIN bulk_balance_banks_quarter_fmp b ON i.symbol = b.symbol AND i.date = b.date
                                            JOIN bulk_cashflow_banks_quarter_fmp c ON i.symbol = c.symbol AND i.date = c.date
                                            WHERE i.date > CURRENT_DATE - INTERVAL 500 DAY
                                        ),            -- C. Growth & Trend (Lagged Data)
            MetricCalc AS (
                SELECT 
                    symbol, 
                    revenue,
                    net_income,
                    equity,
                    op_cashflow,
                    report_date,
                    LAG(revenue) OVER (PARTITION BY symbol ORDER BY report_date) as prev_revenue,
                    LAG(net_income) OVER (PARTITION BY symbol ORDER BY report_date) as prev_net_income,
                    LAG(equity) OVER (PARTITION BY symbol ORDER BY report_date) as prev_equity
                FROM Fundamentals
            ),
            LatestMetrics AS (
                SELECT *,
                    -- Growth
                    (revenue - prev_revenue) / NULLIF(prev_revenue, 0) as rev_growth,
                    -- ROE Trend
                    (net_income / NULLIF(equity, 0)) as current_roe,
                    (prev_net_income / NULLIF(prev_equity, 0)) as prev_roe
                FROM MetricCalc
                QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY report_date DESC) = 1
            ),
            
            -- D. Combine & Score
            RawFactors AS (
                SELECT 
                    p.symbol,
                    p.date_now as as_of,
                    
                    -- Factors
                    (p.price_now / NULLIF(pp.price_12m, 0)) - 1.0 as raw_mom,
                    m.current_roe as raw_roe,
                    m.rev_growth as raw_growth,
                    0.0 as raw_val, -- Placeholder
                    v.vola_90d as raw_vola,
                    
                    -- F-Score Calculation (Simplified 0-5)
                    (CASE WHEN m.net_income > 0 THEN 1 ELSE 0 END) +
                    (CASE WHEN m.op_cashflow > 0 THEN 1 ELSE 0 END) +
                    (CASE WHEN m.op_cashflow > m.net_income THEN 1 ELSE 0 END) +
                    (CASE WHEN m.rev_growth > 0 THEN 1 ELSE 0 END) +
                    (CASE WHEN m.current_roe > m.prev_roe THEN 1 ELSE 0 END) as f_score
                    
                FROM LatestPrices p
                LEFT JOIN PastPrices pp ON p.symbol = pp.symbol
                LEFT JOIN LatestMetrics m ON p.symbol = m.symbol
                LEFT JOIN Volatility v ON p.symbol = v.symbol
            )
            
            -- E. Rank (Percentiles)
            SELECT
                symbol,
                as_of,
                raw_mom, raw_roe, raw_growth, raw_val, raw_vola,
                
                PERCENT_RANK() OVER (ORDER BY raw_mom ASC) * 100 as momentum_score,
                PERCENT_RANK() OVER (ORDER BY raw_roe ASC) * 100 as quality_score,
                PERCENT_RANK() OVER (ORDER BY raw_growth ASC) * 100 as growth_score,
                PERCENT_RANK() OVER (ORDER BY raw_val ASC) * 100 as value_score,
                PERCENT_RANK() OVER (ORDER BY raw_vola DESC) * 100 as safety_score,
                
                f_score,
                
                CURRENT_TIMESTAMP
            FROM RawFactors
            WHERE raw_mom IS NOT NULL
            """
            
            conn.execute(sql)
            count = conn.execute("SELECT COUNT(*) FROM factor_ranks_snapshot").fetchone()[0]
            
            logger.success(f"Factor Ranking Complete. Universe: {count} stocks.")
            return count
            
        except Exception as e:
            logger.error(f"Factor Engine Failed: {e}")
            raise e
        finally:
            conn.close()

    def get_ranks(self, symbol: str) -> Dict[str, Any]:
        """Fetch pre-calculated ranks for a symbol."""
        try:
            res = self.db_mgr.query(f"SELECT * FROM factor_ranks_snapshot WHERE symbol = '{symbol}'")
            if not res.is_empty():
                row = res.to_dicts()[0]
                return {
                    "factor_attribution": [
                        {"factor": "Momentum", "score": row["momentum_score"] or 50},
                        {"factor": "Quality", "score": row["quality_score"] or 50},
                        {"factor": "Growth", "score": row["growth_score"] or 50},
                        {"factor": "Value", "score": row["value_score"] or 50},
                        {"factor": "Safety", "score": row["safety_score"] or 50},
                    ],
                    "raw_metrics": {
                        "momentum_12m": row["raw_momentum"],
                        "roe": row["raw_roe"],
                        "growth_yoy": row["raw_growth"],
                        "volatility": row["raw_volatility"],
                        "f_score": row["f_score"]
                    }
                }
            return None
        except Exception as e:
            logger.error(f"Could not fetch ranks for {symbol}: {e}")
            return None