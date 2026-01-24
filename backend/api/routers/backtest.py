from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from loguru import logger
import mlflow
from datetime import datetime

from config.settings import get_settings
from qsresearch.backtest import run_backtest

router = APIRouter()

class BacktestConfig(BaseModel):
    bundle_name: str = "historical_prices_fmp"
    start_date: str
    end_date: str
    capital_base: float = 100000.0
    experiment_name: str = "API_Backtest"
    algorithm: Dict[str, Any] = {}
    preprocessing: List[Dict[str, Any]] = []
    factors: List[Dict[str, Any]] = []

@router.get("/list")
async def list_backtests(limit: int = 20):
    """
    List historical backtests from MLflow.
    Acts as a proxy to the MLflow tracking server.
    """
    settings = get_settings()
    try:
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        experiment = mlflow.get_experiment_by_name(settings.mlflow_experiment_name)
        
        if not experiment:
            return []
            
        runs = mlflow.search_runs(
            experiment_ids=[experiment.experiment_id],
            max_results=limit,
            order_by=["start_time DESC"]
        )
        
        # Convert pandas DataFrame to list of dicts
        results = []
        if not runs.empty:
            for _, run in runs.iterrows():
                # Extract relevant fields (metrics.*, params.*, tags.*)
                entry = {
                    "run_id": run.get("run_id"),
                    "status": run.get("status"),
                    "start_time": run.get("start_time"), # Usually timestamp
                    "metrics": {k.replace("metrics.", ""): v for k, v in run.items() if k.startswith("metrics.")},
                    "params": {k.replace("params.", ""): v for k, v in run.items() if k.startswith("params.")},
                }
                # Handle NaNs which break JSON
                import math
                if "metrics" in entry:
                     entry["metrics"] = {k: (0 if isinstance(v, float) and math.isnan(v) else v) for k,v in entry["metrics"].items()}
                
                results.append(entry)
                
        return results
        
    except Exception as e:
        logger.error(f"Failed to fetch MLflow runs: {e}")
        # Graceful degradation if MLflow is down
        return []

@router.post("/run")
async def run_backtest_endpoint(config: BacktestConfig):
    """Run a backtest synchronously."""
    try:
        config_dict = config.model_dump()
        results = run_backtest(config_dict, log_to_mlflow=True) # Enable MLflow logging
        
        # Sanitize for JSON response
        metrics = results.get("metrics", {})
        return {"status": "success", "metrics": metrics, "run_id": "mlflow_logged"} 
    except Exception as e:
        logger.error(f"Backtest error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
