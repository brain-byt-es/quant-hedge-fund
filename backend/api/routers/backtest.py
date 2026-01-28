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

    start_date: str = "2020-01-01"

    end_date: str = "2024-12-31"

    capital_base: float = 100000.0

    benchmark: str = "SPY"

    params: Dict[str, Any] = {}



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

    

    return {

        "run_id": info.run_id,

        "experiment_id": info.experiment_id,

        "status": info.status,

        "start_time": datetime.fromtimestamp(info.start_time / 1000).isoformat() if info.start_time else None,

        "end_time": datetime.fromtimestamp(info.end_time / 1000).isoformat() if info.end_time else None,

        "metrics": data.metrics,

        "params": data.params,

        "tags": data.tags,

        "strategy_name": data.tags.get("strategy_name", data.tags.get("mlflow.runName", "Unknown Strategy")),

        "annual_return": data.metrics.get("annual_return", 0.0),

        "sharpe_ratio": data.metrics.get("sharpe", 0.0),

        "max_drawdown": data.metrics.get("max_drawdown", 0.0),

        "alpha": data.metrics.get("alpha", 0.0),

        "beta": data.metrics.get("beta", 0.0),

        "volatility": data.metrics.get("volatility", 0.0),

        "mc_stability_score": data.metrics.get("mc_stability_score", 0.0),

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

    

    # Construct full config for the runner

    config = {

        "experiment_name": MLFLOW_EXPERIMENT_NAME,

        "strategy_name": params.strategy_name,

        "run_name": f"{params.strategy_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",

        "start_date": params.start_date,

        "end_date": params.end_date,

        "capital_base": params.capital_base,

        "benchmark": params.benchmark,

        "algorithm": {

            "callable": "use_factor_as_signal", # Default for now

            "params": params.params

        },

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

    

    return {"status": "accepted", "message": "Backtest started in background"}



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

def trigger_backtest_mock():

    """MOCK Endpoint to simulate a backtest run."""

    # (Same mock logic as before, useful for quick UI tests)

    mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)

    with mlflow.start_run(run_name="Mock_Momentum_Run") as run:

        mlflow.set_tag("strategy_name", "Momentum_Trend_Follower")

        mlflow.log_metric("sharpe", 1.85)

        mlflow.log_metric("annual_return", 0.15)

        mlflow.log_metric("max_drawdown", -0.12)

    return {"status": "started", "run_id": run.info.run_id}
