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
                    
                    -- Market Data
                    price DOUBLE,
                    volume DOUBLE,
                    market_cap DOUBLE,
                    change_1d DOUBLE,
                    
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
                    f_score INTEGER, -- Piotroski-style Score (0-9)
                    
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # The Mega-Query
            sql = """
            INSERT OR REPLACE INTO factor_ranks_snapshot
            WITH 
            -- A. Latest Prices & Momentum
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
                                            i."Gross Profit" as gross_profit,
                                            i."Shares (Basic)" as shares,
                                            b."Total Equity" as equity,
                                            b."Total Assets" as total_assets,
                                            b."Long Term Debt" as lt_debt,
                                            b."Total Current Assets" as curr_assets,
                                            b."Total Current Liabilities" as curr_liab,
                                            c."Net Cash from Operating Activities" as op_cashflow,
                                            i.date as report_date
                                        FROM bulk_income_quarter_fmp i
                                        JOIN bulk_balance_quarter_fmp b ON i.symbol = b.symbol AND i.date = b.date
                                        JOIN bulk_cashflow_quarter_fmp c ON i.symbol = c.symbol AND i.date = c.date
                                        WHERE i.date > CURRENT_DATE - INTERVAL 500 DAY
                                        
                                        UNION ALL
                                        
                                        -- Banks (Mapping restricted by available columns)
                                        SELECT 
                                            i.symbol, 
                                            i."Net Income" as net_income, 
                                            i."Revenue" as revenue,
                                            0 as gross_profit, -- Not applicable/standard
                                            i."Shares (Basic)" as shares,
                                            b."Total Equity" as equity,
                                            b."Total Assets" as total_assets,
                                            b."Long Term Debt" as lt_debt, -- Often exists, check CSV if needed, assumed present or null
                                            0 as curr_assets, -- Banks structure differs
                                            0 as curr_liab,
                                            c."Net Cash from Operating Activities" as op_cashflow,
                                            i.date as report_date
                                        FROM bulk_income_banks_quarter_fmp i
                                        JOIN bulk_balance_banks_quarter_fmp b ON i.symbol = b.symbol AND i.date = b.date
                                        JOIN bulk_cashflow_banks_quarter_fmp c ON i.symbol = c.symbol AND i.date = c.date
                                        WHERE i.date > CURRENT_DATE - INTERVAL 500 DAY
                                    ),
                                    
                                    -- C. Metric Lags (YoY = Lag 4 Quarters)
                                    MetricCalc AS (
                                        SELECT 
                                            symbol, 
                                            report_date,
                                            -- Current Values
                                            net_income, op_cashflow, total_assets, lt_debt, 
                                            curr_assets, curr_liab, shares, gross_profit, revenue, equity,
                                            
                                            -- Lagged Values (YoY)
                                            LAG(net_income, 4) OVER (PARTITION BY symbol ORDER BY report_date) as prev_net_income,
                                            LAG(total_assets, 4) OVER (PARTITION BY symbol ORDER BY report_date) as prev_total_assets,
                                            LAG(lt_debt, 4) OVER (PARTITION BY symbol ORDER BY report_date) as prev_lt_debt,
                                            LAG(curr_assets, 4) OVER (PARTITION BY symbol ORDER BY report_date) as prev_curr_assets,
                                            LAG(curr_liab, 4) OVER (PARTITION BY symbol ORDER BY report_date) as prev_curr_liab,
                                            LAG(shares, 4) OVER (PARTITION BY symbol ORDER BY report_date) as prev_shares,
                                            LAG(gross_profit, 4) OVER (PARTITION BY symbol ORDER BY report_date) as prev_gross_profit,
                                            LAG(revenue, 4) OVER (PARTITION BY symbol ORDER BY report_date) as prev_revenue
                                        FROM Fundamentals
                                    ),
                                    LatestMetrics AS (
                                        SELECT *,
                                            -- Derived Ratios Current
                                            (net_income / NULLIF(total_assets, 0)) as roa,
                                            (curr_assets / NULLIF(curr_liab, 0)) as current_ratio,
                                            (gross_profit / NULLIF(revenue, 0)) as gross_margin,
                                            (revenue / NULLIF(total_assets, 0)) as asset_turnover,
                                            (lt_debt / NULLIF(total_assets, 0)) as leverage,
                                            
                                            -- Derived Ratios Previous
                                            (prev_net_income / NULLIF(prev_total_assets, 0)) as prev_roa,
                                            (prev_curr_assets / NULLIF(prev_curr_liab, 0)) as prev_current_ratio,
                                            (prev_gross_profit / NULLIF(prev_revenue, 0)) as prev_gross_margin,
                                            (prev_revenue / NULLIF(prev_total_assets, 0)) as prev_asset_turnover,
                                            (prev_lt_debt / NULLIF(prev_total_assets, 0)) as prev_leverage,
                                            
                                            -- Growth Proxy for ranking
                                            (revenue - prev_revenue) / NULLIF(prev_revenue, 0) as rev_growth,
                                            (net_income / NULLIF(equity, 0)) as roe -- Keeping ROE for Quality Factor Rank
                                            
                                        FROM MetricCalc
                                        QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY report_date DESC) = 1
                                    ),
                                    
                                    -- D. Combine & Score
                                    RawFactors AS (
                                        SELECT 
                                            p.symbol,
                                            p.date_now as as_of,
                                            
                                            -- Market Data
                                            p.price_now as price,
                                            p.volume_now as volume,
                                            (p.price_now * COALESCE(m.shares, 0)) as market_cap,
                                            p.change_1d,
                                            
                                            -- Factors for Ranking
                                            (p.price_now / NULLIF(pp.price_12m, 0)) - 1.0 as raw_mom,
                                            m.roe as raw_roe,
                                            m.rev_growth as raw_growth,
                                            0.0 as raw_val, 
                                            v.vola_90d as raw_vola,
                                            
                                                                -- PIOTROSKI F-SCORE (9 Point Standard) - Robust Handling
                                                                -- A. Profitability
                                                                (CASE WHEN COALESCE(m.net_income, 0) > 0 THEN 1 ELSE 0 END) +
                                                                (CASE WHEN COALESCE(m.op_cashflow, 0) > 0 THEN 1 ELSE 0 END) +
                                                                (CASE WHEN COALESCE(m.roa, 0) >= COALESCE(m.prev_roa, 0) THEN 1 ELSE 0 END) +
                                                                (CASE WHEN COALESCE(m.op_cashflow, 0) > COALESCE(m.net_income, 0) THEN 1 ELSE 0 END) +
                                                                
                                                                -- B. Leverage & Liquidity
                                                                -- Leverage: Lower is better. If 0 and stays 0, that's good.
                                                                (CASE WHEN COALESCE(m.leverage, 0) <= COALESCE(m.prev_leverage, 0) THEN 1 ELSE 0 END) +
                                                                -- Current Ratio: Higher is better.
                                                                (CASE WHEN COALESCE(m.current_ratio, 0) >= COALESCE(m.prev_current_ratio, 0) THEN 1 ELSE 0 END) +
                                                                -- Shares: No dilution (lower or equal is better).
                                                                (CASE WHEN COALESCE(m.shares, 0) <= COALESCE(m.prev_shares, 0) THEN 1 ELSE 0 END) +
                                                                
                                                                -- C. Operating Efficiency
                                                                (CASE WHEN COALESCE(m.gross_margin, 0) >= COALESCE(m.prev_gross_margin, 0) THEN 1 ELSE 0 END) +
                                                                (CASE WHEN COALESCE(m.asset_turnover, 0) >= COALESCE(m.prev_asset_turnover, 0) THEN 1 ELSE 0 END) 
                                                                as f_score                                            
                                        FROM LatestPrices p
                                        LEFT JOIN PastPrices pp ON p.symbol = pp.symbol
                                        LEFT JOIN LatestMetrics m ON p.symbol = m.symbol
                                        LEFT JOIN Volatility v ON p.symbol = v.symbol
                                    )
            
            -- E. Rank (Percentiles)
            SELECT
                symbol,
                as_of,
                
                -- Market Data
                price, volume, market_cap, change_1d,
                
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
              AND raw_mom < 20 -- Exclude reverse split artifacts (>2000% return)
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