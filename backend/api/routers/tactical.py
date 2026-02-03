from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
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
    date: Optional[str] = Query(None, description="Target date for historical review (YYYY-MM-DD)")
):
    """
    Tactical Scanner Endpoint ("Small-Cap Rocket").
    Returns stocks matching:
    - Price $2-$20
    - Market Cap < $300M
    - Intraday Gain > 10%
    - RVOL > 5x
    - Gap Up > 4%
    """
    try:
        client = get_qs_client()
        signals = find_momentum_rockets(
            client, 
            min_price=min_price, 
            max_price=max_price,
            max_mcap=max_mcap,
            min_gain_pct=min_gain,
            target_date=date
        )
        return signals
    except Exception as e:
        logger.error(f"Tactical Scanner API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
