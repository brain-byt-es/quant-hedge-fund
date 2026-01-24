from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from loguru import logger

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

@router.post("/run")
async def run_backtest_endpoint(config: BacktestConfig):
    """Run a backtest synchronously."""
    try:
        config_dict = config.model_dump()
        results = run_backtest(config_dict, log_to_mlflow=False)
        
        # Sanitize for JSON response
        metrics = results.get("metrics", {})
        # JSON standard doesn't support Infinity/NaN well, consider sanitizing if needed
        return {"status": "success", "metrics": metrics}
    except Exception as e:
        logger.error(f"Backtest error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
