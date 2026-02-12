import yaml
from pathlib import Path
from typing import Dict, Any, List, Optional
from loguru import logger
from datetime import datetime

class RiskManager:
    """
    Centralized Risk Engine for QuantHedgeFund.
    Enforces portfolio-wide constraints and execution safety.
    """
    
    def __init__(self, limits_path: Optional[Path] = None):
        if limits_path is None:
            limits_path = Path(__file__).parent.parent / "config" / "risk_limits.yaml"
        
        self.limits_path = limits_path
        self.limits: Dict[str, Any] = {}
        self.load_limits()

    def load_limits(self):
        """Load risk limits from YAML."""
        try:
            with open(self.limits_path, 'r') as f:
                self.limits = yaml.safe_load(f)
                logger.info("Risk Manager initialized with centralized limits")
        except Exception as e:
            logger.error(f"Failed to load risk limits from {self.limits_path}: {e}")
            self.limits = {}

    def validate_spread(self, symbol: str, bid: float, ask: float) -> (bool, str):
        """
        Check if the bid-ask spread is within acceptable limits (Liquidity Check).
        """
        if bid <= 0 or ask <= 0:
            return False, "Invalid quote (bid/ask <= 0)"
            
        spread_pct = (ask - bid) / ((ask + bid) / 2)
        max_spread = self.limits.get("GLOBAL_LIMITS", {}).get("max_spread_pct", 0.02) # Default 2%
        
        if spread_pct > max_spread:
            return False, f"Spread {spread_pct:.2%} exceeds limit {max_spread:.2%}"
            
        return True, "Spread OK"

    def check_daily_loss(self, current_pnl: float) -> (bool, str):
        """
        Check if the daily P&L has breached the maximum loss limit.
        Returns (True, msg) if circuit breaker should trigger (HALT).
        """
        daily_loss_limit = self.limits.get("GLOBAL_LIMITS", {}).get("daily_loss_limit_usd", 5000.0)
        
        # Note: Limit is positive (e.g. 5000), PnL is negative (e.g. -5500)
        if current_pnl < -abs(daily_loss_limit):
            return True, f"Daily P&L {current_pnl:.2f} exceeds loss limit -{abs(daily_loss_limit):.2f}"
            
        return False, "P&L OK"

    def validate_order(
        self, 
        symbol: str, 
        asset_class: str,
        side: str, 
        quantity: float, 
        price: float, 
        portfolio_value: float,
        current_positions: List[Dict[str, Any]],
        account_info: Dict[str, Any],
        current_daily_pnl: float = 0.0 # Added parameter
    ) -> (bool, str):
        """
        Comprehensive pre-trade check.
        
        Returns:
            (is_valid, reason)
        """
        if not self.limits:
            return False, "Risk limits not loaded"

        order_value = abs(quantity * price)
        
        # 1. Execution Authority Check
        authority = self.limits.get("EXECUTION_AUTHORITY", {})
        allowed_classes = []
        for broker, classes in authority.items():
            if broker != "NONE":
                allowed_classes.extend(classes)
        
        if asset_class not in allowed_classes:
            return False, f"Execution not allowed for asset class: {asset_class}"

        # 2. Daily Loss Limit (Circuit Breaker Check)
        should_halt, msg = self.check_daily_loss(current_daily_pnl)
        if should_halt:
            return False, f"CIRCUIT BREAKER: {msg}"

        # 3. Individual Symbol Exposure
        symbol_limit_pct = self.limits.get("GLOBAL_LIMITS", {}).get("max_symbol_exposure_pct", 0.1)
        
        # Calculate existing position value for this symbol
        existing_value = 0.0
        for pos in current_positions:
            if pos["symbol"] == symbol:
                existing_value = pos["market_value"]
        
        new_symbol_value = abs(existing_value + (order_value if side == "BUY" else -order_value))
        symbol_exposure = new_symbol_value / portfolio_value
        
        if symbol_exposure > symbol_limit_pct:
            return False, f"Symbol exposure {symbol_exposure:.1%} exceeds limit {symbol_limit_pct:.1%}"

        # 4. Asset Class Exposure Check
        ac_limits = self.limits.get("ASSET_CLASS_LIMITS", {}).get(asset_class, {})
        ac_limit_pct = ac_limits.get("max_total_exposure_pct", 1.0)
        
        ac_total_value = order_value
        for pos in current_positions:
            # Note: positions would need to be tagged with asset_class in a real system
            # or looked up from the registry. Assuming for now we can filter by symbol prefix or registry
            from config.registry import get_registry
            reg = get_registry()
            if reg.get_asset_class(pos["symbol"]) == asset_class:
                ac_total_value += abs(pos["market_value"])
        
        ac_exposure = ac_total_value / portfolio_value
        if ac_exposure > ac_limit_pct:
            return False, f"Asset class {asset_class} exposure {ac_exposure:.1%} exceeds limit {ac_limit_pct:.1%}"

        # 5. Leverage Check
        max_leverage = self.limits.get("GLOBAL_LIMITS", {}).get("max_total_leverage", 2.0)
        gross_value = account_info.get("GrossPositionValue", 0.0) + order_value
        leverage = gross_value / portfolio_value
        
        if leverage > max_leverage:
            return False, f"Portfolio leverage {leverage:.2f} exceeds limit {max_leverage}"

        # 6. Asset-Specific Safety Check (Institutional Readiness)
        is_safe, safety_reason = self._validate_asset_safety(symbol, asset_class)
        if not is_safe:
            return False, f"SAFETY REJECTED: {safety_reason}"

        return True, "Risk validation passed"

    def _validate_asset_safety(self, symbol: str, asset_class: str) -> (bool, str):
        """
        Differentiated safety check based on asset class.
        Stocks require fundamental health (F-Score).
        Other assets (Crypto, Gold) rely on liquidity/volatility.
        """
        if asset_class != "STK":
            # Non-stock assets are exempt from fundamental checks
            # (Ready for BTC, GLD, etc.)
            return True, "Safety OK (Non-equity)"

        try:
            # Check F-Score from Factor Engine Snapshot
            from qsconnect.database.duckdb_manager import DuckDBManager
            from config.settings import get_settings
            db = DuckDBManager(get_settings().duckdb_path, read_only=True)
            
            res = db.query(f"SELECT f_score FROM factor_ranks_snapshot WHERE symbol = '{symbol}'")
            if not res.is_empty():
                f_score = res["f_score"][0]
                if f_score is not None and f_score < 3:
                    return False, f"Piotroski F-Score too low ({f_score}/9). High financial distress risk."
            
            return True, "Fundamental Safety OK"
        except Exception as e:
            # If DB fails, we default to Warning but don't block
            logger.warning(f"Safety check DB error for {symbol}: {e}")
            return True, "Safety check skipped (DB error)"

    def calculate_portfolio_var(self, positions: List[Dict[str, Any]], confidence_level: float = 0.95) -> float:
        """
        Estimate Portfolio Value-at-Risk (VaR) using the Historical Simulation method.
        Fetches real historical returns from DuckDB for all positions.
        """
        import numpy as np
        if not positions:
            return 0.0
            
        try:
            from qsconnect.database.duckdb_manager import DuckDBManager
            from config.settings import get_settings
            db = DuckDBManager(get_settings().duckdb_path, read_only=True)
            
            symbols = [p["symbol"] for p in positions]
            weights = np.array([p["market_value"] for p in positions])
            total_value = sum(abs(w) for w in weights)
            
            if total_value == 0: return 0.0
            
            # Normalize weights (preserving sign for Long/Short)
            normalized_weights = weights / total_value

            # 1. Fetch last 252 days of returns for all symbols
            # We use Polars for high-speed pivot and covariance calculation
            symbols_str = ",".join([f"'{s}'" for s in symbols])
            sql = f"""
                SELECT symbol, date, (close / lag(close) OVER (PARTITION BY symbol ORDER BY date)) - 1 as daily_return
                FROM historical_prices_fmp
                WHERE symbol IN ({symbols_str})
                AND date > (CURRENT_DATE - INTERVAL 300 DAY)
            """
            df_returns = db.query(sql).drop_nulls()
            
            if df_returns.is_empty():
                logger.warning("No historical returns found for VaR calculation. Falling back to 2% proxy.")
                return total_value * 0.02

            # Pivot to Symbol Columns
            pivoted = df_returns.pivot(values="daily_return", index="date", on="symbol").drop("date").fill_null(0.0)
            returns_matrix = pivoted.to_numpy() # Rows: Days, Cols: Symbols
            
            # 2. Calculate Portfolio Returns
            # Dot product: [Days x Symbols] * [Symbols x 1] = [Days x 1]
            portfolio_returns = np.dot(returns_matrix, normalized_weights)
            
            # 3. Percentile-based VaR
            # 95% confidence = 5th percentile of losses
            var_percentile = np.percentile(portfolio_returns, (1 - confidence_level) * 100)
            
            # VaR is typically expressed as a positive dollar amount (the potential loss)
            return abs(var_percentile) * total_value

        except Exception as e:
            logger.error(f"Advanced VaR calculation failed: {e}. Using fallback.")
            return sum(abs(p["market_value"]) for p in positions) * 0.02

    def get_portfolio_exposure(self, positions: List[Dict[str, Any]], total_equity: float) -> Dict[str, Any]:
        """Calculates Long, Short, Gross and Net exposure."""
        long_val = sum(p["market_value"] for p in positions if p["market_value"] > 0)
        short_val = sum(abs(p["market_value"]) for p in positions if p["market_value"] < 0)
        
        gross = long_val + short_val
        net = long_val - short_val
        
        return {
            "long_exposure_usd": float(long_val),
            "short_exposure_usd": float(short_val),
            "gross_exposure_usd": float(gross),
            "net_exposure_usd": float(net),
            "net_leverage": float(net / total_equity) if total_equity > 0 else 0.0,
            "gross_leverage": float(gross / total_equity) if total_equity > 0 else 0.0
        }

    def get_concentration_metrics(self, positions: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Detects sector and industry concentration."""
        from qsconnect.database.duckdb_manager import DuckDBManager
        from config.settings import get_settings
        db = DuckDBManager(get_settings().duckdb_path, read_only=True)
        
        symbols = [p["symbol"] for p in positions]
        if not symbols: return {"sectors": [], "industries": []}
        
        # Get metadata for positions
        symbols_str = ",".join([f"'{s}'" for s in symbols])
        meta = db.query(f"SELECT symbol, sector, industry FROM stock_list_fmp WHERE symbol IN ({symbols_str})").to_dicts()
        meta_map = {m["symbol"]: m for m in meta}
        
        total_value = sum(abs(p["market_value"]) for p in positions)
        if total_value == 0: return {"sectors": [], "industries": []}
        
        sector_map = {}
        for p in positions:
            m = meta_map.get(p["symbol"], {"sector": "Unknown", "industry": "Unknown"})
            sec = m["sector"] or "Unknown"
            sector_map[sec] = sector_map.get(sec, 0.0) + abs(p["market_value"])
            
        sector_list = [
            {"name": k, "value": v, "weight": v/total_value} 
            for k, v in sorted(sector_map.items(), key=lambda x: x[1], reverse=True)
        ]
        
        return {"sectors": sector_list}

    def get_portfolio_risk(self, positions: List[Dict[str, Any]], total_equity: float) -> Dict[str, Any]:
        """
        Get a structured summary of all portfolio risk metrics.
        """
        var_95 = self.calculate_portfolio_var(positions, 0.95)
        es_95 = self.calculate_expected_shortfall(positions, 0.95)
        exposure = self.get_portfolio_exposure(positions, total_equity)
        concentration = self.get_concentration_metrics(positions)
        
        return {
            "summary": {
                "var_95_usd": float(var_95),
                "var_95_percent": float(var_95 / total_equity) if total_equity > 0 else 0.0,
                "expected_shortfall_usd": float(es_95),
                "total_equity": float(total_equity)
            },
            "exposure": exposure,
            "concentration": concentration,
            "stress_tests": self.run_stress_test(positions, total_equity)
        }

    def run_stress_test(self, positions: List[Dict[str, Any]], total_equity: float) -> List[Dict[str, Any]]:
        """
        Run multiple 'What-if' crash scenarios.
        """
        scenarios = [
            {"name": "S&P 500 Correction", "market_drop": -0.05, "beta": 1.0},
            {"name": "Tech Sector Crash", "market_drop": -0.10, "beta": 1.5},
            {"name": "Black Monday (1987)", "market_drop": -0.22, "beta": 1.0},
            {"name": "NVDA Flash Crash", "symbol": "NVDA", "drop": -0.15}
        ]
        
        results = []
        for s in scenarios:
            impact = 0.0
            if "market_drop" in s:
                # Impact = PortfolioValue * MarketDrop * PortfolioBeta
                # Assuming portfolio beta of 1.1 for now
                impact = total_equity * s["market_drop"] * s.get("beta", 1.1)
            elif "symbol" in s:
                # Specific symbol crash
                for p in positions:
                    if p["symbol"] == s["symbol"]:
                        impact = p["market_value"] * s["drop"]
            
            results.append({
                "scenario": s["name"],
                "impact_usd": float(impact),
                "impact_percent": float(impact / total_equity) if total_equity > 0 else 0.0,
                "status": "SEVERE" if abs(impact/total_equity) > 0.1 else "WARNING"
            })
            
        return results

    def get_volatility_adjusted_size(self, portfolio_value: float, price: float, atr: float, risk_per_trade_pct: float = 0.01) -> int:
        """
        Calculates position size based on ATR (Average True Range).
        Risk 1% of equity per 'N' (ATR unit).
        """
        if atr <= 0:
            return 0
        
        risk_amount = portfolio_value * risk_per_trade_pct
        shares = int(risk_amount / (atr * price)) # Simplistic sizing logic
        return shares
