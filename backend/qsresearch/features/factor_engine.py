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

    def calculate_universe_ranks(self, min_mcap: float = None, min_volume: float = None) -> int:
        """
        Calculates percentile ranks for the entire universe across 5 factors.
        Stores the result in `factor_ranks_snapshot`.
        """
        if min_mcap is None: min_mcap = self.settings.min_market_cap
        if min_volume is None: min_volume = self.settings.min_volume

        logger.info(f"Starting Factor Engine: Calculating Universe Ranks (Min Cap: ${min_mcap:,.0f}, Min Vol: {min_volume:,.0f})...")
        
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
                    
                    -- Market Data
                    price DOUBLE,
                    volume DOUBLE,
                    market_cap DOUBLE,
                    change_1d DOUBLE,
                    
                    -- Raw Metrics (for transparency)
                    raw_mom DOUBLE,
                    raw_roe DOUBLE,
                    raw_growth DOUBLE,
                    raw_earnings_yield DOUBLE,
                    raw_vola DOUBLE,
                    
                    -- Scores
                    momentum_score DOUBLE,
                    quality_score DOUBLE,
                    growth_score DOUBLE,
                    value_score DOUBLE,
                    safety_score DOUBLE,
                    insider_score DOUBLE DEFAULT 0.0,
                    f_score INTEGER, -- Piotroski-style Score (0-9)
                    
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # The Mega-Query
            sql = f"""
            INSERT OR REPLACE INTO factor_ranks_snapshot
            WITH 
            -- A. Latest Prices
            LatestPrices AS (
                SELECT 
                    symbol, 
                    close as price_now, 
                    volume as volume_now, 
                    date as date_now,
                    ((close / NULLIF(LAG(close) OVER (PARTITION BY symbol ORDER BY date), 0)) - 1) * 100 as change_1d
                FROM historical_prices_fmp
                QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
            ),
            
            -- B. Momentum (Price ~1yr ago)
            -- We find the most recent price that is at least 360 days old
            PastPrices AS (
                SELECT symbol, close as price_12m
                FROM historical_prices_fmp
                QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol, (date <= CURRENT_DATE - INTERVAL 360 DAY) ORDER BY date DESC) = 1
                AND date <= CURRENT_DATE - INTERVAL 360 DAY
            ),
            
            -- C. Volatility (Last 90 days)
            Volatility AS (
                SELECT symbol, stddev(change_percent) * 15.87 as vola_90d 
                FROM historical_prices_fmp
                WHERE date >= CURRENT_DATE - INTERVAL 90 DAY
                GROUP BY symbol
            ),
            
            -- D. Insider Sentiment (Cluster Buys)
            InsiderSentiment AS (
                SELECT 
                    symbol,
                    CASE WHEN COUNT(DISTINCT reporting_name) >= 3 THEN 100.0 ELSE 0.0 END as insider_score
                FROM insider_trades
                WHERE transaction_date >= CURRENT_DATE - INTERVAL 90 DAY
                  AND transaction_type LIKE '%Purchase%'
                  AND transaction_type NOT LIKE '%Option%'
                GROUP BY symbol
            ),

            -- E. Unified Fundamentals (Robust Multi-Statement Join)
            -- We gather all components separately and join them by symbol + latest date
            Income AS (
                SELECT symbol, date, "Net Income", "Revenue", "Gross Profit", "Shares (Basic)"
                FROM (
                    SELECT symbol, date, "Net Income", "Revenue", "Gross Profit", "Shares (Basic)" FROM bulk_income_quarter_fmp 
                    UNION ALL SELECT symbol, date, "Net Income", "Revenue", 0.0 as "Gross Profit", "Shares (Basic)" FROM bulk_income_banks_quarter_fmp
                    UNION ALL SELECT symbol, date, "Net Income", "Revenue", 0.0 as "Gross Profit", "Shares (Basic)" FROM bulk_income_insurance_quarter_fmp
                ) 
                QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) <= 5 -- Keep last 5 quarters for YoY
            ),
            Balance AS (
                SELECT symbol, date, "Total Equity", "Total Assets", "Long Term Debt", "Total Current Assets", "Total Current Liabilities"
                FROM (
                    SELECT symbol, date, "Total Equity", "Total Assets", "Long Term Debt", "Total Current Assets", "Total Current Liabilities" FROM bulk_balance_quarter_fmp
                    UNION ALL SELECT symbol, date, "Total Equity", "Total Assets", "Long Term Debt", 0.0 as "Total Current Assets", 0.0 as "Total Current Liabilities" FROM bulk_balance_banks_quarter_fmp
                    UNION ALL SELECT symbol, date, "Total Equity", "Total Assets", "Long Term Debt", 0.0 as "Total Current Assets", 0.0 as "Total Current Liabilities" FROM bulk_balance_insurance_quarter_fmp
                )
                QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) <= 5
            ),
            Cashflow AS (
                SELECT symbol, date, "Net Cash from Operating Activities"
                FROM (
                    SELECT symbol, date, "Net Cash from Operating Activities" FROM bulk_cashflow_quarter_fmp
                    UNION ALL SELECT symbol, date, "Net Cash from Operating Activities" FROM bulk_cashflow_banks_quarter_fmp
                    UNION ALL SELECT symbol, date, "Net Cash from Operating Activities" FROM bulk_cashflow_insurance_quarter_fmp
                )
                QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) <= 5
            ),
            
            -- Combine Fundamentals (Latest Quarter)
            Fundamentals AS (
                SELECT 
                    i.symbol, 
                    i."Net Income" as net_income, i."Revenue" as revenue, i."Gross Profit" as gross_profit, i."Shares (Basic)" as shares, i.date as report_date,
                    b."Total Equity" as equity, b."Total Assets" as total_assets, b."Long Term Debt" as lt_debt, b."Total Current Assets" as curr_assets, b."Total Current Liabilities" as curr_liab,
                    c."Net Cash from Operating Activities" as op_cashflow,
                    
                    -- Lagged Values (YoY = 4 quarters ago)
                    LAG(i."Net Income", 4) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_net_income,
                    LAG(b."Total Assets", 4) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_total_assets,
                    LAG(b."Long Term Debt", 4) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_lt_debt,
                    LAG(b."Total Current Assets", 4) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_curr_assets,
                    LAG(b."Total Current Liabilities", 4) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_curr_liab,
                    LAG(i."Shares (Basic)", 4) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_shares,
                    LAG(i."Gross Profit", 4) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_gross_profit,
                    LAG(i."Revenue", 4) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_revenue
                FROM Income i
                LEFT JOIN Balance b ON i.symbol = b.symbol AND abs(date_diff('day', i.date, b.date)) <= 14
                LEFT JOIN Cashflow c ON i.symbol = c.symbol AND abs(date_diff('day', i.date, c.date)) <= 14
            ),
            
            LatestMetrics AS (
                SELECT *,
                    -- Derived Ratios
                    (net_income / NULLIF(total_assets, 0)) as roa,
                    (curr_assets / NULLIF(curr_liab, 0)) as current_ratio,
                    (gross_profit / NULLIF(revenue, 0)) as gross_margin,
                    (revenue / NULLIF(total_assets, 0)) as asset_turnover,
                    (lt_debt / NULLIF(total_assets, 0)) as leverage,
                    
                    (prev_net_income / NULLIF(prev_total_assets, 0)) as prev_roa,
                    (prev_curr_assets / NULLIF(prev_curr_liab, 0)) as prev_current_ratio,
                    (prev_gross_profit / NULLIF(prev_revenue, 0)) as prev_gross_margin,
                    (prev_revenue / NULLIF(prev_total_assets, 0)) as prev_asset_turnover,
                    (prev_lt_debt / NULLIF(prev_total_assets, 0)) as prev_leverage,
                    
                    (revenue - prev_revenue) / NULLIF(prev_revenue, 0) as rev_growth,
                    (net_income / NULLIF(equity, 0)) as roe 
                FROM Fundamentals
                QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY report_date DESC) = 1
            ),
            
            RawFactors AS (
                SELECT 
                    p.symbol, p.date_now as as_of, p.price_now as price, p.volume_now as volume, (p.price_now * COALESCE(m.shares, 0)) as market_cap, p.change_1d,
                    (p.price_now / NULLIF(pp.price_12m, 0)) - 1.0 as raw_mom,
                    m.roe as raw_roe, m.rev_growth as raw_growth, (m.net_income / NULLIF(p.price_now * m.shares, 0)) as raw_earnings_yield, v.vola_90d as raw_vola,
                    
                    -- PIOTROSKI F-SCORE
                    (CASE WHEN COALESCE(m.net_income, 0) > 0 THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(m.op_cashflow, 0) > 0 THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(m.roa, 0) >= COALESCE(m.prev_roa, 0) THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(m.op_cashflow, 0) > COALESCE(m.net_income, 0) THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(m.leverage, 0) <= COALESCE(m.prev_leverage, 0) THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(m.current_ratio, 0) >= COALESCE(m.prev_current_ratio, 0) THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(m.shares, 0) <= COALESCE(m.prev_shares, 0) THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(m.gross_margin, 0) >= COALESCE(m.prev_gross_margin, 0) THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(m.asset_turnover, 0) >= COALESCE(m.prev_asset_turnover, 0) THEN 1 ELSE 0 END) 
                    as f_score                                            
                FROM LatestPrices p
                LEFT JOIN PastPrices pp ON p.symbol = pp.symbol
                LEFT JOIN LatestMetrics m ON p.symbol = m.symbol
                LEFT JOIN Volatility v ON p.symbol = v.symbol
                LEFT JOIN InsiderSentiment ins ON p.symbol = ins.symbol
            )
            
            SELECT
                symbol, as_of, price, volume, market_cap, change_1d,
                raw_mom, raw_roe, raw_growth, raw_earnings_yield, raw_vola,
                COALESCE(PERCENT_RANK() OVER (ORDER BY raw_mom ASC) * 100, 50) as momentum_score,
                COALESCE(PERCENT_RANK() OVER (ORDER BY raw_roe ASC) * 100, 50) as quality_score,
                COALESCE(PERCENT_RANK() OVER (ORDER BY raw_growth ASC) * 100, 50) as growth_score,
                COALESCE(PERCENT_RANK() OVER (ORDER BY raw_earnings_yield ASC) * 100, 50) as value_score,
                COALESCE(PERCENT_RANK() OVER (ORDER BY raw_vola DESC) * 100, 50) as safety_score,
                COALESCE(insider_score, 0.0) as insider_score,
                f_score,
                CURRENT_TIMESTAMP
            FROM RawFactors
            WHERE market_cap >= {min_mcap} 
              AND volume >= {min_volume}
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
                
                def safe_score(val):
                    return float(val) if val is not None else 50.0

                return {
                    "factor_attribution": [
                        {"factor": "Momentum", "score": safe_score(row.get("momentum_score"))},
                        {"factor": "Quality", "score": safe_score(row.get("quality_score"))},
                        {"factor": "Growth", "score": safe_score(row.get("growth_score"))},
                        {"factor": "Value", "score": safe_score(row.get("value_score"))},
                        {"factor": "Safety", "score": safe_score(row.get("safety_score"))},
                    ],
                    "raw_metrics": {
                        "momentum_12m": row.get("raw_mom"),
                        "roe": row.get("raw_roe"),
                        "growth_yoy": row.get("raw_growth"),
                        "earnings_yield": row.get("raw_earnings_yield"),
                        "volatility": row.get("raw_vola"),
                        "f_score": row.get("f_score", 0),
                        "insider_score": row.get("insider_score", 0.0)
                    }
                }
            return None
        except Exception as e:
            logger.error(f"Could not fetch ranks for {symbol}: {e}")
            return None