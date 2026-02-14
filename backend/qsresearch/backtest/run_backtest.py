"""
QS Research - Backtest Runner

Stable backtesting execution engine using FastEngine (Pandas) for Quant Lab
and Zipline for standard strategies.
"""

import os
import pickle
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
from loguru import logger

try:
    import mlflow
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    logger.warning("MLflow not installed. Experiment tracking disabled.")

from config.settings import get_settings
from qsresearch.portfolio_analysis.performance_metrics import calculate_all_metrics


def run_backtest(
    config: Dict[str, Any],
    output_dir: Optional[Path] = None,
    log_to_mlflow: bool = True,
) -> Dict[str, Any]:
    """Main entry point for running backtests."""
    settings = get_settings()

    # Project-local paths
    cwd = Path.cwd()
    project_root = cwd if (cwd / "data").exists() else cwd.parent
    os.environ["ZIPLINE_ROOT"] = str((project_root / "data" / "zipline").absolute())

    if output_dir is None:
        output_dir = project_root / "data" / "outputs" / "backtests"
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Starting backtest: {config.get('strategy_name', 'unnamed')}")

    # Extract config
    bundle_name = config.get("bundle_name", "historical_prices_fmp")
    start_date = config.get("start_date", "2023-01-01")
    end_date = config.get("end_date", datetime.now().strftime("%Y-%m-%d"))
    capital_base = config.get("capital_base", 1_000_000)

    # Engine Selection
    algorithm_config = config.get("algorithm", {})
    algorithm_name = algorithm_config.get("callable", "")

    # MLflow Setup
    if log_to_mlflow and MLFLOW_AVAILABLE:
        db_path = project_root / "backend" / "mlflow.db"
        mlflow.set_tracking_uri(f"sqlite:///{db_path.absolute()}")
        mlflow.set_experiment(config.get("experiment_name", "QuantHedgeFund_Strategy_Lab"))

    # ROUTING
    if algorithm_name == "custom_logic":
        logger.info("🚀 Using FastEngine (Stable Pandas) for Quant Lab.")
        results = _run_wrapped_fast_engine(
            bundle_name, start_date, end_date, capital_base, config, output_dir, log_to_mlflow
        )
    else:
        # Fallback to Zipline for built-in strategies if they exist
        strategy_name = config.get("strategy_name", "Momentum_Standard")
        zipline_file = project_root / "backend" / "qsresearch" / "strategies" / f"{strategy_name.lower().replace(' ', '_')}.py"

        if zipline_file.exists():
            logger.info(f"Using Zipline for standard strategy: {zipline_file}")
            results = _run_zipline_backtest(zipline_file, bundle_name, start_date, end_date, capital_base, config, output_dir, log_to_mlflow)
        else:
            logger.warning(f"Strategy file {zipline_file} not found. Defaulting to FastEngine.")
            results = _run_wrapped_fast_engine(bundle_name, start_date, end_date, capital_base, config, output_dir, log_to_mlflow)

    return results


def _run_wrapped_fast_engine(
    bundle_name: str,
    start_date: str,
    end_date: str,
    capital_base: float,
    config: Dict[str, Any],
    output_dir: Path,
    log_to_mlflow: bool
) -> Dict[str, Any]:
    """Stable Pandas-based simulator supporting Class-based strategies with pre-computed factors."""
    import importlib.util

    # 1. Load Data
    price_data = _load_price_data(bundle_name, start_date, end_date)
    if price_data.empty:
        raise ValueError("No price data found for the selected period.")

    # 2. Load Pre-computed Factors (Optimized)
    factor_data = _load_factor_data(start_date, end_date)
    if not factor_data.empty:
        logger.info(f"Loaded {len(factor_data)} factor records for backtest.")
    else:
        logger.warning("No pre-computed factors found. Strategy logic using factors will fail.")

    # 3. Load Strategy Class Safely
    current_dir = Path(__file__).parent.parent.parent
    strategy_file = current_dir / "qsresearch" / "strategies" / "factor" / "algorithms.py"

    spec = importlib.util.spec_from_file_location("user_strategy", strategy_file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    if not hasattr(module, 'Strategy'):
        raise ImportError("Strategy file must contain a 'Strategy' class inheriting from BaseStrategy.")
    
    strategy_instance = module.Strategy()

    # Context Mock
    class Context:
        def __init__(self, cap):
            self.capital_base = cap
            self.portfolio_value = cap
            self.account = {"settled_cash": cap}
            self.positions = {}

    context = Context(capital_base)

    # API Mocks & Injection
    target_weights = {}
    def order_target_percent(asset, weight):
        target_weights[asset.symbol] = weight

    def symbol(s):
        class Asset:
            def __init__(self, t): self.symbol = t
        return Asset(s)

    def record(**kwargs): pass

    # Inject methods into strategy instance
    strategy_instance.symbol = symbol
    strategy_instance.order_target_percent = order_target_percent
    strategy_instance.record = record

    # Run Initialize
    strategy_instance.initialize(context)

    # 4. Simulate
    price_matrix = price_data.pivot(index='date', columns='symbol', values='close')
    returns_matrix = price_matrix.pct_change().fillna(0)
    
    # Factor lookup optimization: Group by date
    factor_by_date = {}
    if not factor_data.empty:
        for dt, group in factor_data.groupby('date'):
            factor_by_date[dt] = group.set_index('symbol').to_dict(orient='index')

    class Data:
        def __init__(self, p, f): 
            self.prices = p
            self.factors = f or {}
            
        def current(self, asset, field): 
            if field == 'price':
                return self.prices.get(asset.symbol, 0)
            return self.factors.get(asset.symbol, {}).get(field, 0)

    all_signals = []
    sim_dates = price_matrix.index.sort_values()
    
    last_available_factors = {}
    sorted_factor_dates = sorted(factor_by_date.keys())

    for dt in sim_dates:
        if dt in factor_by_date:
            last_available_factors = factor_by_date[dt]
        else:
            recent_dates = [fd for fd in sorted_factor_dates if fd <= dt]
            if recent_dates:
                last_available_factors = factor_by_date[recent_dates[-1]]

        prices = price_matrix.loc[dt].to_dict()
        data = Data(prices, last_available_factors)
        
        # Run strategy iteration
        strategy_instance.handle_data(context, data)
        all_signals.append(target_weights.copy())

    signals_df = pd.DataFrame(all_signals, index=price_matrix.index).fillna(0)
    weights = signals_df.shift(1).fillna(0)

    # 5. Returns & Costs
    from qsresearch.backtest.brokerage_models import get_brokerage_model
    broker_name = config.get("brokerage", "ALPACA")
    broker_model = get_brokerage_model(broker_name)

    port_returns = (returns_matrix * weights).sum(axis=1)
    total_weights = weights.abs().sum(axis=1)
    port_returns = port_returns / total_weights.replace(0, 1)

    # Calculate Realistic Costs
    weight_changes = weights.diff().fillna(0)
    daily_costs = []
    current_val = capital_base
    for dt in sim_dates:
        changes = weight_changes.loc[dt]
        day_fee = 0.0
        day_slippage = 0.0

        for symbol_name, d_weight in changes.items():
            if d_weight == 0: continue

            trade_value = abs(d_weight) * current_val
            price = price_matrix.at[dt, symbol_name]
            shares = int(trade_value / price) if price > 0 else 0
            side = "buy" if d_weight > 0 else "sell"

            day_fee += broker_model.calculate_fees(trade_value, shares, side)
            slippage_pct = broker_model.get_slippage(symbol_name, 1000001)
            day_slippage += trade_value * slippage_pct

        total_drag = (day_fee + day_slippage) / current_val
        daily_costs.append(total_drag)
        day_ret = port_returns.at[dt] - total_drag
        current_val *= (1 + day_ret)

    final_returns = port_returns - pd.Series(daily_costs, index=port_returns.index)

    cum_returns = (1 + final_returns).cumprod()
    performance = pd.DataFrame({
        "date": price_matrix.index,
        "returns": final_returns,
        "portfolio_value": cum_returns * capital_base
    })

    # 6. Metrics & MLflow
    metrics = calculate_all_metrics(performance)

    if log_to_mlflow and MLFLOW_AVAILABLE:
        run_name = config.get("run_name", f"fast_{datetime.now().strftime('%H%M%S')}")
        with mlflow.start_run(run_name=run_name):
            _log_params_to_mlflow(config)
            for k, v in metrics.items():
                if isinstance(v, (int, float)): mlflow.log_metric(k, v)

            output_path = output_dir / f"fast_perf_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pkl"
            with open(output_path, "wb") as f: pickle.dump({"metrics": metrics, "config": config}, f)
            mlflow.log_artifact(str(output_path))

    logger.success(f"Backtest Complete. Return: {metrics.get('portfolio_total_return', 0):.2%}")
    return {"performance": performance, "metrics": metrics, "config": config}

    signals_df = pd.DataFrame(all_signals, index=price_matrix.index).fillna(0)
    weights = signals_df.shift(1).fillna(0)

    # 5. Returns & Costs
    from qsresearch.backtest.brokerage_models import get_brokerage_model
    broker_name = config.get("brokerage", "ALPACA")
    broker_model = get_brokerage_model(broker_name)

    port_returns = (returns_matrix * weights).sum(axis=1)
    total_weights = weights.abs().sum(axis=1)
    port_returns = port_returns / total_weights.replace(0, 1)

    # Calculate Realistic Costs
    weight_changes = weights.diff().fillna(0)
    daily_costs = []
    current_val = capital_base
    for dt in sim_dates:
        changes = weight_changes.loc[dt]
        day_fee = 0.0
        day_slippage = 0.0

        for symbol_name, d_weight in changes.items():
            if d_weight == 0: continue

            trade_value = abs(d_weight) * current_val
            price = price_matrix.at[dt, symbol_name]
            shares = int(trade_value / price) if price > 0 else 0
            side = "buy" if d_weight > 0 else "sell"

            day_fee += broker_model.calculate_fees(trade_value, shares, side)
            slippage_pct = broker_model.get_slippage(symbol_name, 1000001)
            day_slippage += trade_value * slippage_pct

        total_drag = (day_fee + day_slippage) / current_val
        daily_costs.append(total_drag)
        day_ret = port_returns.at[dt] - total_drag
        current_val *= (1 + day_ret)

    final_returns = port_returns - pd.Series(daily_costs, index=port_returns.index)

    cum_returns = (1 + final_returns).cumprod()
    performance = pd.DataFrame({
        "date": price_matrix.index,
        "returns": final_returns,
        "portfolio_value": cum_returns * capital_base
    })

    # 6. Metrics & MLflow
    metrics = calculate_all_metrics(performance)

    if log_to_mlflow and MLFLOW_AVAILABLE:
        run_name = config.get("run_name", f"fast_{datetime.now().strftime('%H%M%S')}")
        with mlflow.start_run(run_name=run_name):
            _log_params_to_mlflow(config)
            for k, v in metrics.items():
                if isinstance(v, (int, float)): mlflow.log_metric(k, v)

            output_path = output_dir / f"fast_perf_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pkl"
            with open(output_path, "wb") as f: pickle.dump({"metrics": metrics, "config": config}, f)
            mlflow.log_artifact(str(output_path))

    logger.success(f"Backtest Complete. Return: {metrics.get('portfolio_total_return', 0):.2%}")
    return {"performance": performance, "metrics": metrics, "config": config}


def _load_factor_data(start_date: str, end_date: str) -> pd.DataFrame:
    """Load pre-computed factors from the database."""
    from qsconnect import Client
    client = Client()
    try:
        # Load factors from factor_history table
        sql = f"SELECT * FROM factor_history WHERE date >= '{start_date}' AND date <= '{end_date}'"
        factors = client.query(sql)
        return factors.to_pandas()
    except Exception as e:
        logger.warning(f"Failed to load factor data: {e}")
        return pd.DataFrame()


def _run_zipline_backtest(strategy_file, bundle_name, start_date, end_date, capital_base, config, output_dir, log_to_mlflow):
    """Legacy Zipline runner (only used if strategies exist)."""
    # Use naive dates
    start_ts = pd.Timestamp(start_date).replace(tzinfo=None)
    end_ts = pd.Timestamp(end_date).replace(tzinfo=None)

    # Dummy benchmark (UTC)
    dates = pd.date_range(start=start_ts, end=end_ts, freq='B', tz='UTC')
    benchmark_returns = pd.Series(0.0, index=dates)

    # Note: This will likely still fail with NumPy 2.x unlesspatched,
    # but we move it to a legacy path.
    return {"error": "Zipline currently incompatible with NumPy 2.x. Use FastEngine."}


def _load_price_data(bundle_name, start_date, end_date):
    from qsconnect import Client
    client = Client()
    prices = client._db_manager.get_prices(start_date=start_date, end_date=end_date)
    return prices.to_pandas()


def _apply_preprocessing(df, config): return df
def _apply_factors(df, config): return df
def _log_params_to_mlflow(config):
    for k, v in config.items():
        try: mlflow.log_param(k, str(v)[:250])
        except: pass

def run_monte_carlo_check(returns): return {"mc_p_value": 0.5}
