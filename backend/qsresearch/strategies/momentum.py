import json
import os
import sys
from pathlib import Path

# Add backend to path for Zipline
sys.path.append(os.getcwd())

import loguru
from zipline.api import (
    attach_pipeline,
    date_rules,
    get_open_orders,
    order_target_percent,
    pipeline_output,
    schedule_function,
    time_rules,
)
from zipline.pipeline import Pipeline
from zipline.pipeline.data import USEquityPricing
from zipline.pipeline.factors import AverageDollarVolume

from qsresearch.strategies.factor.momentum_factors import make_momentum_factor

# Load Configuration
CONFIG_PATH = Path("qsresearch/strategies/configurations/strategy_momentum_v1.json")

def load_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)

CONFIG = load_config()

def make_pipeline():
    """
    Create a pipeline that filters by liquidity and calculates momentum.
    """
    # Universe Settings
    universe_config = CONFIG["universe"]
    min_price = universe_config.get("min_price", 5.0)
    min_volume = universe_config.get("min_volume_avg_30d", 1000000)

    # Factors
    mean_close_10m = USEquityPricing.close.latest
    dollar_volume = AverageDollarVolume(window_length=30)

    # Screen
    # Ensure strictly liquid stocks
    liquid_screen = (USEquityPricing.close.latest >= min_price) & (dollar_volume >= min_volume)

    # Alpha Model
    alpha_config = CONFIG["alpha_model"]
    params = alpha_config["params"]

    momentum = make_momentum_factor(
        window_length=params["window_length"],
        gap_window=params["gap_window"]
    )

    return Pipeline(
        columns={
            "momentum": momentum,
        },
        screen=liquid_screen & momentum.notnull()
    )

def initialize(context):
    """
    Called once at the start of the simulation.
    """
    context.params = CONFIG

    # Rebalance Schedule
    # "frequency": "monthly", "date_rule": "month_start", "time_rule": "market_open", "offset_minutes": 60
    sched_config = CONFIG["portfolio_construction"]["rebalance_schedule"]

    # Mapping simple config strings to zipline rules (simplified)
    # Ideally this should be robust.

    schedule_function(
        rebalance,
        date_rules.month_start(),
        time_rules.market_open(minutes=sched_config.get("offset_minutes", 60))
    )

    attach_pipeline(make_pipeline(), "momentum_pipeline")

def before_trading_start(context, data):
    """
    Called every day before market open.
    """
    context.pipeline_data = pipeline_output("momentum_pipeline")

def rebalance(context, data):
    """
    Execute orders based on pipeline output.
    """
    pipeline_data = context.pipeline_data

    # Alpha Logic: Rank Descending
    # "top_n_percentile": 0.10
    top_n_pct = context.params["portfolio_construction"]["top_n_percentile"]

    # Select top percentile
    n_assets = len(pipeline_data)
    n_long = int(n_assets * top_n_pct)

    if n_long == 0:
        loguru.logger.warning("No assets selected for rebalance.")
        return

    # Sort by momentum descending
    top_assets = pipeline_data.sort_values("momentum", ascending=False).head(n_long)

    # Weighting: Equal Weight
    # "weighting": "equal_weight"
    # total_weight = 1.0 (assuming 100% long)
    weight = 1.0 / len(top_assets)

    # Execute Orders
    current_assets = set(top_assets.index)

    # Close positions not in target
    for asset in context.portfolio.positions:
        if asset not in current_assets and get_open_orders(asset):
             # Cancel open orders for assets we are selling (optional, depends on logic)
             pass
        if asset not in current_assets:
            order_target_percent(asset, 0)

    # Open/Adjust positions
    for asset in top_assets.index:
        if data.can_trade(asset):
            order_target_percent(asset, weight)

