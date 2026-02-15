"""
Factor Engine - The "Brain" of Quant Science.
Institutional-grade metrics with 130+ ratios via FinanceToolkit.
"""

from typing import Any, Dict

import numpy as np
import pandas as pd
from financetoolkit import Toolkit
from loguru import logger

from config.settings import get_settings
from qsconnect.database.remote_writer import RemoteWriter


class FactorEngine:
    def __init__(self, db_mgr=None):
        self.settings = get_settings()
        # Always initialize writer for Proxy access
        self.writer = RemoteWriter()
        
        if db_mgr:
            self.db_mgr = db_mgr
        else:
            # We still keep a reference to a local manager if needed, but we prefer the proxy
            from qsconnect.database.duckdb_manager import DuckDBManager
            self.db_mgr = DuckDBManager(self.settings.duckdb_path, read_only=True)

    def calculate_universe_ranks(self, min_mcap: float = None, min_volume: float = None) -> int:
        """Standard SQL ranking for the whole universe. Uses RemoteWriter for the snapshot."""
        if min_mcap is None: min_mcap = self.settings.min_market_cap
        if min_volume is None: min_volume = self.settings.min_volume
        try:
            # We use the writer to ensure the table is created/updated in the master process
            self.writer.execute("DROP TABLE IF EXISTS factor_ranks_snapshot")
            self.writer.execute("""
                CREATE TABLE factor_ranks_snapshot (
                    symbol VARCHAR PRIMARY KEY,
                    as_of DATE,
                    price DOUBLE,
                    market_cap DOUBLE,
                    volume DOUBLE,
                    change_1d DOUBLE,
                    momentum_score DOUBLE,
                    quality_score DOUBLE,
                    growth_score DOUBLE,
                    value_score DOUBLE,
                    safety_score DOUBLE,
                    f_score INTEGER,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # The actual ranking logic is a complex SELECT INTO, so we send it as a raw command
            self._execute_remote_sql_ranking(min_mcap, min_volume)
            
            # Verify count via Proxy
            res = self.writer.query("SELECT COUNT(*) as count FROM factor_ranks_snapshot")
            return int(res["count"][0]) if not res.is_empty() else 0
        except Exception as e:
            logger.error(f"Rank Calculation Error: {e}")
            return 0

    def _execute_remote_sql_ranking(self, min_mcap, min_volume):
        """Send the ranking SQL to the Remote Writer."""
        sql = f"""
        INSERT OR REPLACE INTO factor_ranks_snapshot
        WITH PriceData AS (
            SELECT 
                symbol, 
                date, 
                close, 
                volume,
                (close / NULLIF(LAG(close) OVER (PARTITION BY symbol ORDER BY date), 0) - 1.0) * 100.0 as change_percent
            FROM historical_prices_fmp
        ),
        LatestPrices AS (
            SELECT symbol, date, close, volume, change_percent
            FROM PriceData
            QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
        ),
        PastPrices AS (
            SELECT symbol, date, close
            FROM historical_prices_fmp
            WHERE date < (CURRENT_DATE - INTERVAL 360 DAY)
            QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
        ),
        FundamentalData AS (
            SELECT 
                i.symbol, 
                i.date, 
                i."Net Income", 
                i."Shares (Basic)", 
                i.Revenue,
                i."Gross Profit",
                b."Total Assets",
                b."Total Equity",
                b."Total Current Assets",
                b."Total Current Liabilities",
                b."Long Term Debt",
                c."Net Cash from Operating Activities" as cfo,
                LAG(i."Net Income" / NULLIF(b."Total Assets", 0)) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_roa,
                LAG(b."Long Term Debt" / NULLIF(b."Total Assets", 0)) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_leverage,
                LAG(b."Total Current Assets" / NULLIF(b."Total Current Liabilities", 0)) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_current_ratio,
                LAG(i."Shares (Basic)") OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_shares,
                LAG(i."Gross Profit" / NULLIF(i.Revenue, 0)) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_gross_margin,
                LAG(i.Revenue / NULLIF(b."Total Assets", 0)) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_asset_turnover
            FROM bulk_income_quarter_fmp i
            LEFT JOIN bulk_balance_quarter_fmp b ON i.symbol = b.symbol AND i.date = b.date
            LEFT JOIN bulk_cashflow_quarter_fmp c ON i.symbol = c.symbol AND i.date = c.date
        ),
        LatestFundamentals AS (
            SELECT *
            FROM FundamentalData
            QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
        ),
        PrevFundamentals AS (
            SELECT f.symbol, f.date, f.Revenue
            FROM FundamentalData f
            JOIN LatestFundamentals lf ON f.symbol = lf.symbol AND f.date < lf.date
            QUALIFY ROW_NUMBER() OVER (PARTITION BY f.symbol ORDER BY f.date DESC) = 1
        ),
        RawFactors AS (
            SELECT 
                s.symbol, 
                COALESCE(p.date, CURRENT_DATE) as as_of, 
                COALESCE(p.close, s.price, 0.0) as price,
                COALESCE(p.volume, 0.0) as volume,
                COALESCE(p.change_percent, 0.0) as change_1d,
                COALESCE(p.close * i."Shares (Basic)", s.price * i."Shares (Basic)", 0.0) as market_cap,
                ((COALESCE(p.close, s.price) / NULLIF(p_past.close, 0)) - 1.0) as raw_mom,
                (i."Net Income" / NULLIF(b."Total Equity", 0)) as raw_roe,
                (i.Revenue - i_prev.Revenue) / NULLIF(i_prev.Revenue, 0) as raw_growth,
                (i."Net Income" * 4 / NULLIF(COALESCE(p.close, s.price) * i."Shares (Basic)", 0)) as raw_value,
                -- 9-Point Piotroski F-Score
                (
                    CASE WHEN (i."Net Income" / NULLIF(i."Total Assets", 0)) > 0 THEN 1 ELSE 0 END + 
                    CASE WHEN i.cfo > 0 THEN 1 ELSE 0 END + 
                    CASE WHEN (i."Net Income" / NULLIF(i."Total Assets", 0)) > COALESCE(i.prev_roa, 0) THEN 1 ELSE 0 END + 
                    CASE WHEN (i.cfo / NULLIF(i."Total Assets", 0)) > (i."Net Income" / NULLIF(i."Total Assets", 0)) THEN 1 ELSE 0 END + 
                    CASE WHEN (i."Long Term Debt" / NULLIF(i."Total Assets", 0)) <= COALESCE(i.prev_leverage, 1) THEN 1 ELSE 0 END + 
                    CASE WHEN (i."Total Current Assets" / NULLIF(i."Total Current Liabilities", 0)) > COALESCE(i.prev_current_ratio, 0) THEN 1 ELSE 0 END + 
                    CASE WHEN i."Shares (Basic)" <= COALESCE(i.prev_shares, i."Shares (Basic)") THEN 1 ELSE 0 END + 
                    CASE WHEN (i."Gross Profit" / NULLIF(i.Revenue, 0)) > COALESCE(i.prev_gross_margin, 0) THEN 1 ELSE 0 END + 
                    CASE WHEN (i.Revenue / NULLIF(i."Total Assets", 0)) > COALESCE(i.prev_asset_turnover, 0) THEN 1 ELSE 0 END
                ) as f_score
            FROM stock_list_fmp s
            LEFT JOIN LatestPrices p ON s.symbol = p.symbol
            LEFT JOIN PastPrices p_past ON s.symbol = p_past.symbol
            LEFT JOIN LatestFundamentals i ON s.symbol = i.symbol
            LEFT JOIN PrevFundamentals i_prev ON s.symbol = i_prev.symbol
            LEFT JOIN LatestFundamentals b ON s.symbol = b.symbol
        )
        SELECT symbol, as_of, price, market_cap, volume, change_1d,
            COALESCE(PERCENT_RANK() OVER (ORDER BY raw_mom ASC) * 100, 50.0),
            COALESCE(PERCENT_RANK() OVER (ORDER BY raw_roe ASC) * 100, 50.0),
            COALESCE(PERCENT_RANK() OVER (ORDER BY raw_growth ASC) * 100, 50.0),
            COALESCE(PERCENT_RANK() OVER (ORDER BY raw_value ASC) * 100, 50.0),
            50.0, f_score, CURRENT_TIMESTAMP
        FROM RawFactors 
        WHERE price > 0
        """
        self.writer.execute(sql)

    def calculate_historical_factors(self, start_date: str, end_date: str, frequency: str = "monthly") -> int:
        """
        Calculates historical factors for the entire universe at a specific frequency.
        Supports both Local (standalone) and Remote (proxy) execution.
        """
        logger.info(f"Calculating historical factors from {start_date} to {end_date} ({frequency})...")
        
        # PROXY MODE: Delegate to Data Service if we don't have a RW connection
        if self.db_mgr.read_only:
            logger.info("Executing historical factors remotely via Unified Data Service...")
            return self.writer.calculate_historical_factors(start_date, end_date, frequency)

        # LOCAL MODE: Direct DB Access (For standalone RW processes or DataService internal call)
        try:
            conn = self.db_mgr.connect()
            interval = "1 MONTH" if frequency == "monthly" else "1 WEEK"
            dates_df = conn.execute(f"""
                SELECT CAST(range AS DATE) as eval_date 
                FROM range(CAST('{start_date}' AS DATE), CAST('{end_date}' AS DATE) + INTERVAL 1 DAY, INTERVAL {interval})
            """).df()

            total_inserted = 0
            for eval_date in dates_df['eval_date']:
                eval_date_str = eval_date.strftime('%Y-%m-%d')
                logger.info(f"Processing Factors for {eval_date_str}...")
                
                sql = f"""
                INSERT OR REPLACE INTO factor_history (
                    symbol, date, price, market_cap, volatility,
                    momentum_score, quality_score, growth_score, value_score, safety_score, f_score
                )
                WITH DailyReturns AS (
                    SELECT symbol, date, close,
                        (close / NULLIF(LAG(close) OVER (PARTITION BY symbol ORDER BY date), 0) - 1.0) as daily_ret
                    FROM historical_prices_fmp WHERE date <= '{eval_date_str}'
                ),
                PriceData AS (
                    SELECT symbol, date, close,
                        daily_ret * 100.0 as change_percent,
                        stddev_pop(daily_ret) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 20 PRECEDING AND CURRENT ROW) as vol_20d
                    FROM DailyReturns
                ),
                LatestPrices AS (
                    SELECT symbol, date, close, change_percent, vol_20d
                    FROM PriceData QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
                ),
                PastPrices AS (
                    SELECT symbol, date, close FROM historical_prices_fmp
                    WHERE date < (CAST('{eval_date_str}' AS DATE) - INTERVAL 360 DAY)
                    QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) = 1
                ),
                FundamentalData AS (
                    SELECT i.symbol, i.date as report_date, COALESCE(i."Publish Date", i.date) as publish_date,
                        i."Net Income", i."Shares (Basic)", i.Revenue, i."Gross Profit",
                        b."Total Assets", b."Total Equity", b."Total Current Assets", b."Total Current Liabilities", b."Long Term Debt",
                        c."Net Cash from Operating Activities" as cfo,
                        LAG(i."Net Income" / NULLIF(b."Total Assets", 0)) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_roa,
                        LAG(b."Long Term Debt" / NULLIF(b."Total Assets", 0)) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_leverage,
                        LAG(b."Total Current Assets" / NULLIF(b."Total Current Liabilities", 0)) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_current_ratio,
                        LAG(i."Shares (Basic)") OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_shares,
                        LAG(i."Gross Profit" / NULLIF(i.Revenue, 0)) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_gross_margin,
                        LAG(i.Revenue / NULLIF(b."Total Assets", 0)) OVER (PARTITION BY i.symbol ORDER BY i.date) as prev_asset_turnover
                    FROM bulk_income_quarter_fmp i
                    LEFT JOIN bulk_balance_quarter_fmp b ON i.symbol = b.symbol AND i.date = b.date
                    LEFT JOIN bulk_cashflow_quarter_fmp c ON i.symbol = c.symbol AND i.date = c.date
                    WHERE COALESCE(i."Publish Date", i.date) <= '{eval_date_str}'
                ),
                LatestFundamentals AS (
                    SELECT * FROM FundamentalData QUALIFY ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY report_date DESC) = 1
                ),
                PrevFundamentals AS (
                    SELECT f.symbol, f.report_date, f.Revenue FROM FundamentalData f
                    JOIN LatestFundamentals lf ON f.symbol = lf.symbol AND f.report_date < lf.report_date
                    QUALIFY ROW_NUMBER() OVER (PARTITION BY f.symbol ORDER BY f.report_date DESC) = 1
                ),
                RawFactors AS (
                    SELECT s.symbol, CAST('{eval_date_str}' AS DATE) as as_of, 
                        COALESCE(p.close, s.price, 0.0) as price,
                        COALESCE(p.close * i."Shares (Basic)", s.price * i."Shares (Basic)", 0.0) as market_cap,
                        COALESCE(p.vol_20d, 0.015) as volatility,
                        ((COALESCE(p.close, s.price) / NULLIF(p_past.close, 0)) - 1.0) as raw_mom,
                        (i."Net Income" / NULLIF(b."Total Equity", 0)) as raw_roe,
                        (i.Revenue - i_prev.Revenue) / NULLIF(i_prev.Revenue, 0) as raw_growth,
                        (i."Net Income" * 4 / NULLIF(COALESCE(p.close, s.price) * i."Shares (Basic)", 0)) as raw_value,
                        (
                            CASE WHEN (i."Net Income" / NULLIF(i."Total Assets", 0)) > 0 THEN 1 ELSE 0 END + 
                            CASE WHEN i.cfo > 0 THEN 1 ELSE 0 END + 
                            CASE WHEN (i."Net Income" / NULLIF(i."Total Assets", 0)) > COALESCE(i.prev_roa, 0) THEN 1 ELSE 0 END + 
                            CASE WHEN (i.cfo / NULLIF(i."Total Assets", 0)) > (i."Net Income" / NULLIF(i."Total Assets", 0)) THEN 1 ELSE 0 END + 
                            CASE WHEN (i."Long Term Debt" / NULLIF(i."Total Assets", 0)) <= COALESCE(i.prev_leverage, 1) THEN 1 ELSE 0 END + 
                            CASE WHEN (i."Total Current Assets" / NULLIF(i."Total Current Liabilities", 0)) > COALESCE(i.prev_current_ratio, 0) THEN 1 ELSE 0 END + 
                            CASE WHEN i."Shares (Basic)" <= COALESCE(i.prev_shares, i."Shares (Basic)") THEN 1 ELSE 0 END + 
                            CASE WHEN (i."Gross Profit" / NULLIF(i.Revenue, 0)) > COALESCE(i.prev_gross_margin, 0) THEN 1 ELSE 0 END + 
                            CASE WHEN (i.Revenue / NULLIF(i."Total Assets", 0)) > COALESCE(i.prev_asset_turnover, 0) THEN 1 ELSE 0 END
                        ) as f_score
                    FROM stock_list_fmp s
                    LEFT JOIN LatestPrices p ON s.symbol = p.symbol
                    LEFT JOIN PastPrices p_past ON s.symbol = p_past.symbol
                    LEFT JOIN LatestFundamentals i ON s.symbol = i.symbol
                    LEFT JOIN PrevFundamentals i_prev ON s.symbol = i_prev.symbol
                    LEFT JOIN LatestFundamentals b ON s.symbol = b.symbol
                )
                SELECT 
                    CAST(symbol AS VARCHAR), 
                    CAST(as_of AS DATE), 
                    CAST(price AS DOUBLE), 
                    CAST(market_cap AS DOUBLE), 
                    CAST(volatility AS DOUBLE),
                    CAST(COALESCE(PERCENT_RANK() OVER (ORDER BY raw_mom ASC) * 100, 50.0) AS DOUBLE),
                    CAST(COALESCE(PERCENT_RANK() OVER (ORDER BY raw_roe ASC) * 100, 50.0) AS DOUBLE),
                    CAST(COALESCE(PERCENT_RANK() OVER (ORDER BY raw_growth ASC) * 100, 50.0) AS DOUBLE),
                    CAST(COALESCE(PERCENT_RANK() OVER (ORDER BY raw_value ASC) * 100, 50.0) AS DOUBLE),
                    CAST(50.0 AS DOUBLE), 
                    CAST(f_score AS INTEGER)
                FROM RawFactors WHERE price > 0
                """
                conn.execute(sql)
                total_inserted += conn.execute(f"SELECT COUNT(*) FROM factor_history WHERE date = '{eval_date_str}'").fetchone()[0]

            return total_inserted
        except Exception as e:
            logger.error(f"Historical Factor Calculation Error: {e}")
            return 0
        finally: 
            try: conn.close()
            except: pass

    def get_detailed_metrics(self, symbol: str) -> Dict[str, Any]:
        """
        ULTRA-FIDELITY: Calculates ALL 130+ ratios via FinanceToolkit with Proxy decoupling.
        """
        try:
            # 1. Fetch raw data via Proxy (100% decoupling from DB file)
            income = self.writer.query_pandas(f"SELECT * FROM bulk_income_quarter_fmp WHERE symbol = '{symbol}' ORDER BY date ASC")
            balance = self.writer.query_pandas(f"SELECT * FROM bulk_balance_quarter_fmp WHERE symbol = '{symbol}' ORDER BY date ASC")
            cash = self.writer.query_pandas(f"SELECT * FROM bulk_cashflow_quarter_fmp WHERE symbol = '{symbol}' ORDER BY date ASC")
            prices = self.writer.query_pandas(f"SELECT date, close as 'Adj Close' FROM historical_prices_fmp WHERE symbol = '{symbol}' ORDER BY date ASC")

            if income.empty or balance.empty:
                return {"error": f"Insufficient data for {symbol}. Ingest SimFin/FMP bulk data first."}

            # 2. Comprehensive Mapping for FinanceToolkit (JerBouma)
            # These map SimFin/FMP keys to the internal names Toolkit expects for its models.
            inc_map = {
                'Revenue': 'Revenue',
                'Cost of Revenue': 'Cost of Goods Sold',
                'Gross Profit': 'Gross Profit',
                'Net Income': 'Net Income',
                'Shares (Basic)': 'Weighted Average Shares',
                'Operating Income (Loss)': 'Operating Income',
                'Pretax Income (Loss), Adj.': 'Income Before Tax',
                'Income Tax (Expense) Benefit, Net': 'Income Tax Expense',
                'Selling, General & Administrative': 'Selling, General and Administrative Expenses',
                'Research & Development': 'Research and Development Expenses',
                'Interest Expense, Net': 'Interest Expense'
            }
            bal_map = {
                'Total Assets': 'Total Assets',
                'Total Equity': 'Total Equity',
                'Long Term Debt': 'Long Term Debt',
                'Total Current Assets': 'Total Current Assets',
                'Total Current Liabilities': 'Total Current Liabilities',
                'Cash, Cash Equivalents & Short Term Investments': 'Cash and Cash Equivalents',
                'Inventories': 'Inventory',
                'Accounts & Notes Receivable': 'Accounts Receivable',
                'Property, Plant & Equipment, Net': 'Fixed Assets',
                'Intangible Assets': 'Intangible Assets'
            }
            cas_map = {
                'Net Cash from Operating Activities': 'Operating Cash Flow',
                'Depreciation & Amortization': 'Depreciation and Amortization',
                'Capital Expenditures': 'Capital Expenditure'
            }

            def prepare_for_tk(df, sym, mapping):
                # Clean columns: remove SimFin metadata that might confuse the join
                df = df.rename(columns=mapping)
                df['date'] = pd.to_datetime(df['date'])
                df = df.sort_values('date').set_index('date')
                # Keep only valid mapped columns OR columns that Toolkit might recognize as generic
                df = df.drop(columns=['symbol', 'updated_at', 'period', 'SimFinId', 'Currency'], errors='ignore')
                df.columns = pd.MultiIndex.from_product([[sym], df.columns])
                return df

            # 3. Initialize Toolkit with Transposed Statements (Required for 2.0+)
            toolkit = Toolkit(
                tickers=[symbol],
                historical=prepare_for_tk(prices, symbol, {}),
                income=prepare_for_tk(income, symbol, inc_map).T,
                balance=prepare_for_tk(balance, symbol, bal_map).T,
                cash=prepare_for_tk(cash, symbol, cas_map).T,
                quarterly=True,
                reverse_dates=False,
                benchmark_ticker=None
            )

            # 4. Collect Ratios with error handling per category
            ratios_result = {}
            categories = {
                "Profitability": toolkit.ratios.collect_profitability_ratios,
                "Valuation": toolkit.ratios.collect_valuation_ratios,
                "Liquidity": toolkit.ratios.collect_liquidity_ratios,
                "Efficiency": toolkit.ratios.collect_efficiency_ratios,
                "Solvency": toolkit.ratios.collect_solvency_ratios
            }

            grouped = {cat: {} for cat in categories}

            for cat_name, func in categories.items():
                try:
                    df = func()
                    if not df.empty:
                        # Convert to Series if single ticker
                        if isinstance(df, pd.Series):
                            for metric, val in df.items():
                                if not np.isinf(val) and not np.isnan(val): grouped[cat_name][metric] = float(val)
                        else:
                            # Handle MultiIndex DataFrame
                            for metric in df.index.get_level_values(0).unique():
                                try:
                                    val = df.loc[metric, symbol].dropna().iloc[-1]
                                    if not np.isinf(val) and not np.isnan(val): grouped[cat_name][metric] = float(val)
                                except: continue
                except Exception as e:
                    logger.warning(f"Category {cat_name} failed for {symbol}: {e}")

            # 5. Collect Model (Piotroski)
            piotroski_score = 0
            try:
                models = toolkit.models.get_piotroski_score()
                if not models.empty:
                    piotroski_score = int(models.loc[symbol].dropna().iloc[-1])
            except: pass

            total_metrics = sum(len(v) for v in grouped.values())

            return {
                "ratios": grouped,
                "piotroski": {"Score": piotroski_score},
                "summary": f"Institutional deep-dive complete for {symbol}. {total_metrics} metrics calculated via FinanceToolkit."
            }

        except Exception as e:
            logger.error(f"Analysis failed for {symbol}: {e}")
            return {"error": str(e)}

    def get_ranks(self, symbol: str) -> Dict[str, Any]:
        """Fetch pre-calculated ranks for a symbol via Proxy."""
        try:
            # Always use Proxy for snapshot lookups to avoid locks
            res = self.writer.query(f"SELECT * FROM factor_ranks_snapshot WHERE symbol = '{symbol}'")
            if not res.is_empty():
                row = res.to_dicts()[0]
                def s(v): return float(v) if v is not None else 50.0
                return {
                    "factor_attribution": [
                        {"factor": "Momentum", "score": s(row.get("momentum_score"))},
                        {"factor": "Quality", "score": s(row.get("quality_score"))},
                        {"factor": "Growth", "score": s(row.get("growth_score"))},
                        {"factor": "Value", "score": s(row.get("value_score"))},
                        {"factor": "Safety", "score": s(row.get("safety_score"))},
                    ],
                    "raw_metrics": {"f_score": row.get("f_score", 0)}
                }
            return None
        except Exception as e:
            logger.debug(f"Proxy rank fetch failed: {e}")
            return None
