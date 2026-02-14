from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.routers.data import get_qs_client
from qsresearch.realtime.scanner import find_momentum_rockets

router = APIRouter()

@router.get("/momentum-scanner")
def get_tactical_scanner(
    min_price: float = 2.0,
    max_price: float = 20.0,
    max_mcap: float = 300000000.0,
    min_gain: float = 10.0,
    date: Optional[str] = Query(None, description="Target date for historical review (YYYY-MM-DD)"),
    type: str = Query("LowFloatSqueeze", description="Scanner preset type")
):
    """
    Tactical Scanner Endpoint.
    Supported types: LowFloatSqueeze, HaltScanner, ReversalScanner
    """
    try:
        client = get_qs_client()
        signals = find_momentum_rockets(
            client,
            min_price=min_price,
            max_price=max_price,
            max_mcap=max_mcap,
            min_gain_pct=min_gain,
            target_date=date,
            scanner_type=type
        )
        return signals
    except Exception as e:
        logger.error(f"Tactical Scanner API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
