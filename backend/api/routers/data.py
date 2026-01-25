from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date
from loguru import logger
import duckdb

from config.settings import get_settings
from qsconnect import Client as QSConnectClient

router = APIRouter()
qs_client = None

def get_qs_client():
    """Singleton for QS Connect Client (Shared Connection)"""
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
    try:
        settings = get_settings()
        if settings.duckdb_path.exists():
             return {"status": "connected", "path": str(settings.duckdb_path)}
        return {"status": "disconnected", "error": "DB file not found"}
    except Exception as e:
        return {"status": "error", "details": str(e)}

@router.get("/health")
def get_data_health():
    """Get detailed health check of the data (gaps, stale data)."""
    try:
        client = get_qs_client()
        df = client.get_data_health()
        return df.to_dicts()
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/prices/latest")
def get_latest_prices(limit: int = 100):
    """
    Get latest prices using the shared QS Connect client.
    """
    try:
        client = get_qs_client()
        return client.get_latest_prices(limit=limit)
    except Exception as e:
        logger.error(f"Failed to fetch prices: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")

# Global Ingestion State
ingestion_state = {
    "status": "idle", # idle, running, completed, error
    "step": "",
    "progress": 0,
    "details": ""
}

@router.get("/ingest/progress")
def get_ingestion_progress():
    """Get real-time progress of data pipeline."""
    return ingestion_state

@router.post("/ingest")
async def trigger_ingestion(request: IngestRequest, background_tasks: BackgroundTasks):
    """Trigger data ingestion in background."""
    client = get_qs_client()
    
    def update_progress(current, total, step_name="Downloading"):
        ingestion_state["status"] = "running"
        ingestion_state["step"] = step_name
        ingestion_state["progress"] = int((current / total) * 100) if total > 0 else 0
        ingestion_state["details"] = f"{current}/{total}"

    def run_ingestion():
        try:
            logger.info("Starting background ingestion...")
            ingestion_state["status"] = "running"
            ingestion_state["step"] = "Initializing"
            ingestion_state["progress"] = 0
            
            # 1. Download Prices
            ingestion_state["step"] = "Downloading Prices (FMP)"
            
            # We need to inject the callback into the client
            # For now, we wrap the client call or pass it if supported
            # Since FMPClient uses tqdm, we can't easily hook it without modifying FMPClient.
            # I will modify FMPClient to accept a callback in the next step.
            
            prices = client.bulk_historical_prices(
                start_date=date.fromisoformat(request.start_date) if request.start_date else None,
                end_date=date.fromisoformat(request.end_date) if request.end_date else None,
                symbols=request.symbols,
                progress_callback=update_progress # New feature
            )
            
            ingestion_state["progress"] = 100
            
            if prices is None or prices.is_empty():
                logger.warning("No prices downloaded.")
                ingestion_state["status"] = "completed" # or error?
                return

            # 2. Bundle Zipline
            ingestion_state["step"] = "Bundling Zipline Data"
            ingestion_state["progress"] = 0
            client.build_zipline_bundle("historical_prices_fmp")
            ingestion_state["progress"] = 50
            
            # 3. Ingest Bundle
            client.ingest_bundle("historical_prices_fmp")
            ingestion_state["progress"] = 100
            ingestion_state["step"] = "Completed"
            ingestion_state["status"] = "completed"
            
            logger.info("Background ingestion complete.")
            
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            ingestion_state["status"] = "error"
            ingestion_state["details"] = str(e)

    background_tasks.add_task(run_ingestion)
    return {"status": "started", "message": "Ingestion started in background"}
