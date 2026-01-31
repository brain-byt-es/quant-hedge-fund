"""
Strategy Generator & Regime Analyzer
Calculates market signals and prompts the LLM for strategy adjustments.
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
import polars as pl
import json
import hashlib
from loguru import logger

from qsresearch.llm.client import GroqClient

class StrategyGenerator:
    """Regime-aware strategy generator using LLM."""
    
    def __init__(self):
        self.llm_client = GroqClient()
    
    def analyze_market_regime(self, prices: Optional[pl.DataFrame]) -> Dict[str, Any]:
        """
        Calculate simple market regime metrics from price history.
        If prices are None (e.g. cold start), return neutral default regime.
        """
        if prices is None or (hasattr(prices, 'is_empty') and prices.is_empty()):
            logger.info("Market Regime Analysis: No data provided. Assuming Neutral Regime.")
            return {
                "regime_label": "Neutral / Unknown",
                "annualized_volatility": 0.15,
                "6m_return": 0.05,
                "trend_strength_vs_sma200": 0.0,
                "data_points": 0
            }

        try:
            # Convert to pandas for easier time-series calc (or use polars)
            # For simplicity, let's analyze SPY or the aggregate market
            
            # Filter to last 6 months (approx 126 trading days)
            df = prices.to_pandas()
            df['date'] = pd.to_datetime(df['date'])
            
            # Simple Proxy: Average daily return of all stocks
            daily_returns = df.pivot(index='date', columns='symbol', values='close').pct_change().mean(axis=1)
            
            # Metrics
            recent_returns = daily_returns.tail(126) # 6 months
            
            if len(recent_returns) < 20:
                 raise ValueError("Insufficient data points")

            volatility = recent_returns.std() * np.sqrt(252)
            total_return = (1 + recent_returns).prod() - 1
            
            # Trend: Simple SMA comparison (last price vs 200 SMA of index)
            # Create a synthetic index price series
            index_price = (1 + daily_returns).cumprod()
            current_price = index_price.iloc[-1]
            sma_200 = index_price.tail(200).mean() if len(index_price) >= 200 else index_price.mean()
            
            trend_strength = (current_price / sma_200) - 1
            
            # Regime Classification
            if total_return > 0.05 and volatility < 0.15:
                regime = "Bull Steady"
            elif total_return > 0.05 and volatility >= 0.15:
                regime = "Bull Volatile"
            elif total_return < -0.05:
                regime = "Bear"
            else:
                regime = "Sideways"
                
            metrics = {
                "regime_label": regime,
                "annualized_volatility": round(float(volatility), 4),
                "6m_return": round(float(total_return), 4),
                "trend_strength_vs_sma200": round(float(trend_strength), 4),
                "data_points": len(recent_returns)
            }
            
            logger.info(f"Market Regime Analysis: {metrics}")
            return metrics
        except Exception as e:
            logger.warning(f"Regime analysis failed ({e}), using default.")
            return {
                "regime_label": "Neutral",
                "annualized_volatility": 0.15,
                "6m_return": 0.05,
                "trend_strength_vs_sma200": 0.0,
                "data_points": 0
            }

    def validate_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and sanitize strategy configuration.
        """
        try:
            # 1. Validate top_n
            top_n = config.get("top_n", 20)
            if not isinstance(top_n, int):
                top_n = 20
            config["top_n"] = max(5, min(50, top_n))
            
            # 2. Validate weights
            weights = config.get("factor_weights", {})
            if not weights:
                weights = {"momentum": 1.0, "value": 0.0, "quality": 0.0}
            
            # Normalize weights to sum to 1.0
            total_weight = sum(weights.values())
            if total_weight <= 0:
                 weights = {"momentum": 1.0, "value": 0.0, "quality": 0.0}
            elif abs(total_weight - 1.0) > 0.01:
                # Renormalize
                weights = {k: round(v / total_weight, 2) for k, v in weights.items()}
                # Fix rounding error on last item
                diff = 1.0 - sum(weights.values())
                if diff != 0:
                     last_key = list(weights.keys())[-1]
                     weights[last_key] += diff
            config["factor_weights"] = weights
            
            # 3. Validate momentum window
            window = config.get("momentum_window", [21, 252])
            if isinstance(window, list) and len(window) == 2:
                config["momentum_window"] = [
                    max(5, min(504, w)) for w in window
                ]
                # Ensure fast < slow
                if config["momentum_window"][0] >= config["momentum_window"][1]:
                    config["momentum_window"].sort()
            else:
                 config["momentum_window"] = [21, 252]
                 
            return config
            
        except Exception as e:
            logger.error(f"Config validation failed: {e}. Using default.")
            return self._get_default_config()

    def generate_candidates(self, prices: Optional[pl.DataFrame], n: int = 3) -> List[Dict[str, Any]]:
        """
        Generate N distinct strategy candidates for the current regime.
        """
        if not self.llm_client.client:
            logger.warning("LLM Client not available.")
            return [self._get_default_config()] * n
            
        regime = self.analyze_market_regime(prices)
        candidates = []
        
        # MLflow Logging Setup
        try:
            import mlflow
            # Disable MLflow for now to prevent connection timeouts affecting UI latency
            mlflow_active = False 
            # mlflow.set_experiment("LLM_Strategy_Generator")
        except ImportError:
            mlflow_active = False
            logger.warning("MLflow not found. Skipping experiment tracking.")

        for i in range(n):
            try:
                # Add diversity instruction
                style_label = "Neutral"
                diversity_prompt = ""
                
                if i == 0:
                    style_label = "Balanced"
                    diversity_prompt = "Propose a 'Balanced' approach."
                elif i == 1:
                    style_label = "Aggressive"
                    diversity_prompt = "Propose an 'Aggressive' approach (higher risk/return)."
                else:
                    style_label = "Defensive"
                    diversity_prompt = "Propose a 'Defensive' approach (lower volatility)."

                logger.info(f"Generating candidate {i+1}/{n}: {style_label}")
                
                # We reuse the client but inject the diversity nuance
                regime_context = regime.copy()
                regime_context["requested_style"] = diversity_prompt
                
                llm_response = self.llm_client.generate_strategy_params(regime_context)
                raw_config = llm_response.get("config", self._get_default_config())
                reasoning = llm_response.get("reasoning", "No reasoning provided")
                
                # VALIDATE
                valid_config = self.validate_config(raw_config)
                
                # Generate unique immutable hash for this config
                config_str = json.dumps(valid_config, sort_keys=True)
                strat_hash = hashlib.sha256(config_str.encode()).hexdigest()
                
                valid_config["candidate_id"] = f"candidate_{i+1}"
                valid_config["strategy_hash"] = strat_hash
                valid_config["style"] = style_label
                valid_config["reasoning"] = reasoning
                valid_config["regime_snapshot"] = regime # Freeze the context
                
                candidates.append(valid_config)
                
                # MLflow Log
                if mlflow_active:
                    with mlflow.start_run(run_name=f"Generate_{regime.get('regime_label', 'Unknown')}_{i}"):
                        mlflow.log_params(regime)
                        mlflow.log_param("strategy_hash", strat_hash)
                        mlflow.log_param("style", diversity_prompt)
                        mlflow.log_text(reasoning, "reasoning.txt")
                        mlflow.log_dict(valid_config, "config.json")
                        
            except Exception as e:
                logger.error(f"Candidate generation {i} failed: {e}")
                candidates.append(self._get_default_config())

        return candidates

    def generate_strategy(self, prices: Optional[pl.DataFrame]) -> Dict[str, Any]:
        """Original single-strategy method (backward compatibility)"""
        candidates = self.generate_candidates(prices, n=1)
        return candidates[0] if candidates else self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """Safe fallback strategy configuration."""
        return {
            "top_n": 20,
            "momentum_window": [21, 252],
            "rebalance_frequency": "month_end",
            "factor_weights": {"momentum": 1.0, "value": 0.0, "quality": 0.0},
            "strategy_name": "Default_Factor_Mix",
            "style": "Neutral",
            "reasoning": "Baseline momentum strategy."
        }