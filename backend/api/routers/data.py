from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date, datetime
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

@router.get("/stats")
def get_data_stats():
    """Get row counts for all tables."""
    try:
        client = get_qs_client()
        return client._db_manager.get_table_stats()
    except Exception as e:
        logger.error(f"Stats check failed: {e}")
        return []

@router.post("/ingest/stop")
async def stop_ingestion():
    """Stop the running background ingestion."""
    client = get_qs_client()
    client.stop_requested = True
    ingestion_state["status"] = "idle"
    ingestion_state["step"] = "Stopped by User"
    return {"status": "stopping", "message": "Stop signal sent to ingestion engine"}

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

class IngestRequest(BaseModel):
    mode: str = "daily" # 'daily' or 'backfill'
    start_date: Optional[str] = None
    symbols: Optional[List[str]] = None

@router.post("/ingest")
async def trigger_ingestion(request: IngestRequest, background_tasks: BackgroundTasks):
    """Trigger data ingestion via Prefect Flow (Daily or Backfill)."""
    from automation.prefect_flows import daily_sync_flow, historical_backfill_flow
    
    def run_prefect_flow():
        try:
            # Clear any previous stop signal
            client = get_qs_client()
            client.stop_requested = False
            
            ingestion_state["status"] = "running"
            if request.mode == "backfill":
                ingestion_state["step"] = "Backfill: Full History"
                historical_backfill_flow()
            else:
                ingestion_state["step"] = "Daily Sync: EOD"
                daily_sync_flow()
                
            ingestion_state["status"] = "completed"
            ingestion_state["step"] = f"Finished: {request.mode}"
        except Exception as e:
            logger.error(f"Prefect Flow failed: {e}")
            ingestion_state["status"] = "error"
            ingestion_state["details"] = str(e)

    background_tasks.add_task(run_prefect_flow)
    return {"status": "started", "message": f"Ingestion ({request.mode}) started via Prefect"}
