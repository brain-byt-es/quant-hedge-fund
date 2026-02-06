import json
from pathlib import Path
import loguru
import pandas as pd
import numpy as np
from zipline.api import (
    symbol,
    order_target_percent,
    schedule_function,
    date_rules,
    time_rules,
    get_datetime,
)

# Try importing riskfolio, or warn if missing (since we just added it to requirements)
try:
    import riskfolio as rp
except ImportError:
    loguru.logger.warning("riskfolio-lib not installed. Strategy will fail if run.")
    rp = None

# Load Configuration
CONFIG_PATH = Path(__file__).parent / "configurations" / "strategy_vol_target_v1.json"

def load_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)

CONFIG = load_config()

def initialize(context):
    """
    Initialize Volatility Targeting Strategy.
    """
    context.params = CONFIG
    
    # Define Universe
    tickers = CONFIG["universe"]["assets"]
    context.assets = [symbol(ticker) for ticker in tickers]
    context.benchmark = symbol(CONFIG["universe"]["benchmark"])
    
    # Rebalance Schedule
    # Not explicitly detailed in JSON for schedule, but "rebalance_threshold" suggests continuous or periodic.
    # Momentum had monthly. Let's assume Daily or Weekly for Vol Targeting?
    # Usually Vol Target is rebalanced daily or when deviation > threshold.
    # I'll set a daily check but use threshold logic.
    
    schedule_function(
        rebalance,
        date_rules.every_day(),
        time_rules.market_open(minutes=30)
    )

def rebalance(context, data):
    """
    Calculate volatility and adjust weights.
    """
    if rp is None:
        return # Cannot run without riskfolio

    # 1. Get History
    lookback = context.params["risk_model"]["lookback_window"]
    # We need enough data for lookback returns. lookback is usually days.
    # Add buffer for pct_change
    prices = data.history(context.assets, "close", lookback + 5, "1d")
    
    # 2. Calculate Returns
    returns = prices.pct_change().dropna()
    
    # 3. Use Riskfolio to calculate Covariance / Volatility
    port = rp.Portfolio(returns=returns)
    
    # Estimate stats
    # method_cov='hist' (historical covariance)
    try:
        port.assets_stats(method_mu='hist', method_cov='hist')
    except Exception as e:
        loguru.logger.error(f"Riskfolio estimation failed: {e}")
        return

    # Annualized Volatility
    # cov is daily covariance if returns are daily.
    # Vol = sqrt(diag(cov)) * sqrt(252)
    cov = port.cov
    daily_vols = np.sqrt(np.diag(cov))
    annual_vols = daily_vols * np.sqrt(252)
    
    # Map back to assets
    asset_vols = pd.Series(annual_vols, index=cov.index)
    
    # 4. Calculate Target Weights
    # Logic: Weight = Target_Vol / Realized_Vol
    target_vol = context.params["meta"]["target_volatility_annual"]
    vol_cap = context.params["risk_model"]["vol_cap"]
    
    # "allocation_logic": {"leverage_cap": 1.5, ...}
    leverage_cap = context.params["allocation_logic"]["leverage_cap"]
    
    weights = {}
    for asset in context.assets:
        # asset is Zipline Asset object, cov.index are columns from history (Equity objects)
        # They should match or be castable
        
        # Riskfolio/Pandas might use the object itself as index.
        r_vol = asset_vols.get(asset)
        
        if r_vol is None or np.isnan(r_vol) or r_vol == 0:
            weights[asset] = 0.0
            continue
            
        # Cap realized vol if it's too low? Or just use it?
        # The prompt says: "Vol Cap" in risk_model. 
        # Usually Vol Cap means "don't assume vol is lower than X" or "limit max weight"?
        # "vol_cap": 0.20 usually refers to max allowed volatility or something?
        # Actually, let's stick to the core formula: W = T / Vol.
        
        # If Realized Vol is very low, W becomes huge.
        # We clamp W via leverage_cap implicitly, but let's calculate raw first.
        
        raw_weight = target_vol / r_vol
        
        # Apply Leverage Cap per asset? Or total? 
        # Usually Vol Target is per-asset or portfolio level. 
        # Context implies asset-level sizing here: "Size positions based on risk".
        
        final_weight = min(raw_weight, leverage_cap)
        weights[asset] = final_weight

    # 5. Execute
    # Check rebalance threshold?
    # "rebalance_threshold": 0.05
    threshold = context.params["allocation_logic"]["rebalance_threshold"]
    
    current_weights = context.portfolio.current_portfolio_weights
    
    for asset, target_w in weights.items():
        current_w = current_weights.get(asset, 0)
        
        if abs(target_w - current_w) > threshold:
            order_target_percent(asset, target_w)
            loguru.logger.info(f"Rebalancing {asset.symbol}: {current_w:.2%} -> {target_w:.2%} (Vol: {asset_vols[asset]:.2%})")

