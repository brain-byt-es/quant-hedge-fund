from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.zipline_service import zipline_service

router = APIRouter()

class BacktestRequest(BaseModel):
    strategy_name: str
    capital: float = 100000.0
    start_date: str = "2023-01-01"
    end_date: str = "2023-12-31"
    parameters: Dict[str, Any] # e.g. {"lookback": 30}

@router.post("/run")
async def run_backtest(request: BacktestRequest):
    """
    Starts a Zipline backtest.
    """
    try:
        result = await zipline_service.run_backtest(request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{run_id}/results")
async def get_results(run_id: str):
    """
    Retrieves results for a specific backtest run.
    """
    result = zipline_service.get_backtest_status(run_id)
    if result["status"] == "not_found":
        raise HTTPException(status_code=404, detail="Backtest ID not found")
    return result
