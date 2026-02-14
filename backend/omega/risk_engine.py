import numpy as np
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from loguru import logger


class RiskManager:
    """
    Risk Engine V2 - Dynamic Volatility-Adjusted Controls.
    Institutional-grade portfolio constraints and regime-aware circuit breakers.
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
                logger.info("Risk Manager initialized with dynamic V2 logic enabled")
        except Exception as e:
            logger.error(f"Failed to load risk limits: {e}")
            self.limits = {}

    def validate_spread(self, symbol: str, bid: float, ask: float) -> (bool, str):
        if bid <= 0 or ask <= 0: return False, "Invalid quote (bid/ask <= 0)"
        spread_pct = (ask - bid) / ((ask + bid) / 2)
        max_spread = self.limits.get("GLOBAL_LIMITS", {}).get("max_spread_pct", 0.02)
        if spread_pct > max_spread:
            return False, f"Spread {spread_pct:.2%} exceeds limit {max_spread:.2%}"
        return True, "Spread OK"

    def get_market_regime_multiplier(self, regime_label: str) -> float:
        """
        Regime-Aware Tightening: Adjust risk tolerance based on market state.
        Bull Steady -> 1.0 (Normal)
        Bull Volatile -> 0.8 (Tighten)
        Bear -> 0.7 (Strict)
        Sideways -> 0.9 (Moderate)
        """
        multipliers = {
            "Bull Steady": 1.0,
            "Bull Volatile": 0.8,
            "Bear": 0.7,
            "Sideways": 0.9,
            "Neutral": 1.0
        }
        return multipliers.get(regime_label, 1.0)

    def check_daily_loss(self, current_pnl: float, portfolio_value: float, realized_vol: float, regime: str = "Neutral") -> (bool, str):
        """
        DYNAMIC CIRCUIT BREAKER (Risk V2):
        Formula: Limit = PortfolioValue * RealizedVol * Z_Score * RegimeMultiplier
        Z_Score: 2.33 for 99% confidence tail event.
        """
        z_score = 2.33 
        regime_mult = self.get_market_regime_multiplier(regime)
        
        # Calculate dynamic limit (e.g. 1,000,000 * 0.015 * 2.33 * 0.8 = $27,960)
        # Use a floor from config to prevent extremely small limits in zero-vol environments
        config_floor = self.limits.get("GLOBAL_LIMITS", {}).get("daily_loss_limit_usd", 5000.0)
        
        dynamic_limit = portfolio_value * realized_vol * z_score * regime_mult
        effective_limit = max(dynamic_limit, config_floor)

        if current_pnl < -abs(effective_limit):
            return True, f"CRITICAL: Daily P&L ${current_pnl:,.2f} breached Dynamic Vol-Adjusted Limit -${effective_limit:,.2f} (Regime: {regime})"

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
        current_daily_pnl: float = 0.0
    ) -> (bool, str):
        if not self.limits: return False, "Risk limits not loaded"
        order_value = abs(quantity * price)

        # 1. Authority Check
        authority = self.limits.get("EXECUTION_AUTHORITY", {})
        allowed_classes = []
        for broker, classes in authority.items():
            if broker != "NONE": allowed_classes.extend(classes)
        if asset_class not in allowed_classes:
            return False, f"Execution not allowed for asset class: {asset_class}"

        # 2. individual Symbol Exposure
        symbol_limit_pct = self.limits.get("GLOBAL_LIMITS", {}).get("max_symbol_exposure_pct", 0.1)
        existing_value = sum(p["market_value"] for p in current_positions if p["symbol"] == symbol)
        new_symbol_value = abs(existing_value + (order_value if side == "BUY" else -order_value))
        if (new_symbol_value / portfolio_value) > symbol_limit_pct:
            return False, f"Symbol exposure {new_symbol_value / portfolio_value:.1%} exceeds limit {symbol_limit_pct:.1%}"

        # 3. Leverage Check
        max_leverage = self.limits.get("GLOBAL_LIMITS", {}).get("max_total_leverage", 2.0)
        gross_value = account_info.get("GrossPositionValue", 0.0) + order_value
        if (gross_value / portfolio_value) > max_leverage:
            return False, f"Portfolio leverage {gross_value / portfolio_value:.2f} exceeds limit {max_leverage}"

        # 4. Fundamental Safety (F-Score)
        is_safe, safety_reason = self._validate_asset_safety(symbol, asset_class)
        if not is_safe: return False, f"SAFETY REJECTED: {safety_reason}"

        return True, "Risk validation passed"

    def _validate_asset_safety(self, symbol: str, asset_class: str) -> (bool, str):
        if asset_class != "STK": return True, "Safety OK (Non-equity)"
        try:
            from qsconnect import Client
            client = Client()
            res = client.query(f"SELECT f_score FROM factor_ranks_snapshot WHERE symbol = '{symbol}'")
            if not res.is_empty():
                f_score = res["f_score"][0]
                if f_score is not None and f_score < 3:
                    return False, f"Piotroski F-Score too low ({f_score}/9). High financial distress risk."
            return True, "Fundamental Safety OK"
        except: return True, "Safety check skipped (API Error)"

    def calculate_portfolio_volatility(self, positions: List[Dict[str, Any]], lookback_days: int = 20) -> float:
        """
        Calculate the Realized Volatility of the current portfolio.
        Returns daily standard deviation of portfolio returns.
        """
        if not positions: return 0.015 # Default 1.5% daily vol
        try:
            from qsconnect import Client
            client = Client()
            symbols = [p["symbol"] for p in positions]
            weights = np.array([p["market_value"] for p in positions])
            total_value = sum(abs(w) for w in weights)
            if total_value == 0: return 0.015
            normalized_weights = weights / total_value

            symbols_str = ",".join([f"'{s}'" for s in symbols])
            sql = f"""
                SELECT symbol, date, (close / lag(close) OVER (PARTITION BY symbol ORDER BY date)) - 1 as daily_return
                FROM historical_prices_fmp
                WHERE symbol IN ({symbols_str})
                AND date > (CURRENT_DATE - INTERVAL {lookback_days + 10} DAY)
            """
            df_returns = client.query(sql).drop_nulls()
            if df_returns.is_empty(): return 0.015

            pivoted = df_returns.pivot(values="daily_return", index="date", on="symbol").drop("date").fill_null(0.0)
            returns_matrix = pivoted.to_numpy()
            portfolio_returns = np.dot(returns_matrix, normalized_weights)
            
            return float(np.std(portfolio_returns))
        except Exception as e:
            logger.error(f"Volatility calculation failed: {e}")
            return 0.015

    def calculate_portfolio_var(self, positions: List[Dict[str, Any]], confidence_level: float = 0.95) -> float:
        if not positions: return 0.0
        try:
            vol = self.calculate_portfolio_volatility(positions, lookback_days=252)
            total_value = sum(abs(p["market_value"]) for p in positions)
            # Parametric VaR
            z_score = 1.645 if confidence_level == 0.95 else 2.33
            return vol * z_score * total_value
        except: return sum(abs(p["market_value"]) for p in positions) * 0.02

    def calculate_expected_shortfall(self, positions: List[Dict[str, Any]], confidence_level: float = 0.95) -> float:
        """
        Calculate Conditional VaR (Expected Shortfall).
        Average loss in the worst (1-confidence)% of cases.
        """
        if not positions: return 0.0
        try:
            from qsconnect import Client
            client = Client()
            symbols = [p["symbol"] for p in positions]
            weights = np.array([p["market_value"] for p in positions])
            total_value = sum(abs(w) for w in weights)
            normalized_weights = weights / total_value

            symbols_str = ",".join([f"'{s}'" for s in symbols])
            sql = f"SELECT symbol, date, (close / lag(close) OVER (PARTITION BY symbol ORDER BY date)) - 1 as daily_return FROM historical_prices_fmp WHERE symbol IN ({symbols_str}) AND date > (CURRENT_DATE - INTERVAL 300 DAY)"
            df_returns = client.query(sql).drop_nulls()
            
            pivoted = df_returns.pivot(values="daily_return", index="date", on="symbol").drop("date").fill_null(0.0)
            portfolio_returns = np.dot(pivoted.to_numpy(), normalized_weights)
            
            var_threshold = np.percentile(portfolio_returns, (1 - confidence_level) * 100)
            tail_losses = portfolio_returns[portfolio_returns <= var_threshold]
            
            return abs(float(np.mean(tail_losses))) * total_value if len(tail_losses) > 0 else 0.0
        except: return self.calculate_portfolio_var(positions, confidence_level) * 1.2

    def get_portfolio_risk(self, positions: List[Dict[str, Any]], total_equity: float) -> Dict[str, Any]:
        var_95 = self.calculate_portfolio_var(positions, 0.95)
        es_95 = self.calculate_expected_shortfall(positions, 0.95)
        realized_vol = self.calculate_portfolio_volatility(positions)
        
        long_val = sum(p["market_value"] for p in positions if p["market_value"] > 0)
        short_val = sum(abs(p["market_value"]) for p in positions if p["market_value"] < 0)

        return {
            "summary": {
                "var_95_usd": float(var_95),
                "var_95_percent": float(var_95 / total_equity) if total_equity > 0 else 0.0,
                "expected_shortfall_usd": float(es_95),
                "realized_vol_daily": float(realized_vol),
                "total_equity": float(total_equity)
            },
            "exposure": {
                "long_usd": float(long_val),
                "short_usd": float(short_val),
                "net_usd": float(long_val - short_val),
                "gross_usd": float(long_val + short_val)
            }
        }
