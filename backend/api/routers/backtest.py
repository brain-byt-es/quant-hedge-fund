"""
QS Connect - Backtest API Router

Handles interaction with MLflow to retrieve backtest results, metrics, and artifacts.
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import List, Dict, Any, Optional
import mlflow
from mlflow.tracking import MlflowClient
from loguru import logger
import pandas as pd
from datetime import datetime
from pydantic import BaseModel

from qsresearch.backtest.run_backtest import run_backtest

router = APIRouter()

# Constants
MLFLOW_EXPERIMENT_NAME = "QuantHedgeFund_Strategy_Lab"

class BacktestParams(BaseModel):
    strategy_name: str = "Momentum_Standard"
    bundle_name: str = "historical_prices_fmp"
    start_date: str = "2020-01-01"
    end_date: str = "2024-12-31"
    capital_base: float = 100000.0
    benchmark: str = "SPY"
    params: Dict[str, Any] = {}
    algorithm: Optional[Dict[str, Any]] = None # New field to override algo config

def get_mlflow_client():
    """Initialize and return MLflow client."""
    try:
        client = MlflowClient()
        return client
    except Exception as e:
        logger.error(f"Failed to connect to MLflow: {e}")
        raise HTTPException(status_code=500, detail="MLflow connection failed")

def _format_run(run) -> Dict[str, Any]:
    """Helper to format a raw MLflow run object into a clean dictionary."""
    data = run.data
    info = run.info
    
    # Map complex metrics to frontend-friendly keys
    metrics = data.metrics
    
    return {
        "run_id": info.run_id,
        "experiment_id": info.experiment_id,
        "status": info.status,
        "start_time": datetime.fromtimestamp(info.start_time / 1000).isoformat() if info.start_time else None,
        "end_time": datetime.fromtimestamp(info.end_time / 1000).isoformat() if info.end_time else None,
        "metrics": metrics,
        "params": data.params,
        "tags": data.tags,
        "strategy_name": data.tags.get("strategy_name", data.tags.get("mlflow.runName", "Unknown Strategy")),
        
        # Mapping Logic
        "annual_return": metrics.get("portfolio_cagr", metrics.get("annual_return", 0.0)),
        "sharpe_ratio": metrics.get("portfolio_yearly_sharpe", metrics.get("sharpe", 0.0)),
        "max_drawdown": metrics.get("portfolio_max_drawdown", metrics.get("max_drawdown", 0.0)),
        "alpha": metrics.get("portfolio_alpha", metrics.get("alpha", 0.0)),
        "beta": metrics.get("portfolio_beta", metrics.get("beta", 0.0)),
        "volatility": metrics.get("portfolio_yearly_vol", metrics.get("volatility", 0.0)),
        "mc_stability_score": metrics.get("mc_stability_score", 0.0),
    }

@router.get("/list")
def list_backtests(limit: int = 20) -> List[Dict[str, Any]]:
    """List all recorded backtests (MLflow runs)."""
    client = get_mlflow_client()
    
    # Ensure experiment exists
    experiment = client.get_experiment_by_name(MLFLOW_EXPERIMENT_NAME)
    if not experiment:
        return []
        
    runs = client.search_runs(
        experiment_ids=[experiment.experiment_id],
        max_results=limit,
        order_by=["attribute.start_time DESC"]
    )
    
    return [_format_run(run) for run in runs]

@router.post("/run")
async def execute_backtest(params: BacktestParams, background_tasks: BackgroundTasks):
    """Trigger a real backtest run via background task."""
    
    # Determine algorithm config
    algo_config = params.algorithm if params.algorithm else {
        "callable": "use_factor_as_signal", 
        "params": params.params
    }

    # Construct full config for the runner
    config = {
        "experiment_name": MLFLOW_EXPERIMENT_NAME,
        "strategy_name": params.strategy_name,
        "bundle_name": params.bundle_name,
        "run_name": f"{params.strategy_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "start_date": params.start_date,
        "end_date": params.end_date,
        "capital_base": params.capital_base,
        "benchmark": params.benchmark,
        "algorithm": algo_config,
        "factors": [
            {"name": "momentum", "params": {"window": params.params.get("window", 20)}}
        ]
    }

    def _task():
        from api.routers.data import get_qs_client
        client = get_qs_client()
        try:
            client.log_event("INFO", "Research", f"Backtest Initialized: {params.strategy_name}")
            logger.info(f"Background task starting backtest: {params.strategy_name}")
            run_backtest(config)
            logger.info(f"Background task completed backtest: {params.strategy_name}")
            client.log_event("INFO", "Research", f"Backtest Completed: {params.strategy_name}. Result ready for Governance.")
        except Exception as e:
            logger.error(f"Backtest task failed: {e}")
            client.log_event("ERROR", "Research", f"Backtest Failed: {params.strategy_name}. Error: {str(e)}")

    background_tasks.add_task(_task)
    
    return {
        "status": "accepted", 
        "message": "Backtest started in background",
        "run_name": config["run_name"]
    }

@router.get("/run/{run_id}")
def get_backtest_details(run_id: str) -> Dict[str, Any]:
    """Get full details for a specific backtest run."""
    client = get_mlflow_client()
    try:
        run = client.get_run(run_id)
        return _format_run(run)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Run not found: {e}")

@router.post("/run_test")
async def trigger_smoke_test(background_tasks: BackgroundTasks):
    """
    SMOKE TEST: Runs a real, short backtest on the data to verify the pipeline.
    Replaces the old Mock endpoint.
    """
    try:
        # Define a safe test configuration
        config = {
            "experiment_name": "System_Health_Checks",
            "strategy_name": "Smoke_Test_BuyHold",
            "run_name": f"SmokeTest_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "start_date": "2023-01-01",
            "end_date": "2023-06-01", # Short window
            "capital_base": 10000.0,
            "benchmark": "SPY",
            "algorithm": {
                "callable": "buy_and_hold", # Simple logic
                "params": {"symbol": "AAPL"} # Test with a liquid stock
            }
        }

        def _run():
            logger.info("Executing Smoke Test (Real Data)...")
            try:
                run_backtest(config)
                logger.info("Smoke Test completed successfully.")
            except Exception as e:
                logger.error(f"Smoke Test Failed: {e}")

        background_tasks.add_task(_run)
        return {"status": "started", "message": "Real Smoke Test initiated in background."}
        
    except Exception as e:
        logger.error(f"Failed to trigger smoke test: {e}")
        raise HTTPException(status_code=500, detail=str(e))