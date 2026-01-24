from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from loguru import logger

from qsconnect import Client as QSConnectClient

router = APIRouter()
qs_client = None

def get_qs_client():
    global qs_client
    if not qs_client:
        qs_client = QSConnectClient()
    return qs_client

class IngestRequest(BaseModel):
    start_date: str = "2020-01-01"
    end_date: Optional[str] = None
    symbols: Optional[List[str]] = None

@router.get("/status")
def get_data_status():
    """Get status of data services."""
    client = get_qs_client()
    return {"status": "connected" if client else "disconnected"}

@router.post("/ingest")
async def trigger_ingestion(request: IngestRequest, background_tasks: BackgroundTasks):
    """Trigger data ingestion in background."""
    client = get_qs_client()
    
    def run_ingestion():
        try:
            logger.info("Starting background ingestion...")
            client.bulk_historical_prices(
                start_date=date.fromisoformat(request.start_date),
                symbols=request.symbols
            )
            client.build_zipline_bundle("historical_prices_fmp")
            client.ingest_bundle("historical_prices_fmp")
            logger.info("Background ingestion complete.")
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")

    background_tasks.add_task(run_ingestion)
    return {"message": "Ingestion started in background"}
