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

# Global Ingestion State (Shared via File for Multi-process support)
def get_state_file():
    from config.settings import get_settings
    return get_settings().duckdb_path.parent / "ingest_state.json"

def save_ingestion_state(state: Dict):
    import json
    try:
        with open(get_state_file(), "w") as f:
            json.dump(state, f)
    except: pass

def load_ingestion_state() -> Dict:
    import json
    try:
        with open(get_state_file(), "r") as f:
            return json.load(f)
    except:
        return {"status": "idle", "step": "", "progress": 0, "details": ""}

@router.get("/ingest/progress")
def get_ingestion_progress():
    """Get real-time progress of data pipeline."""
    return load_ingestion_state()

class IngestRequest(BaseModel):
    mode: str = "daily" # 'daily' or 'backfill'
    start_date: Optional[str] = None
    symbols: Optional[List[str]] = None

@router.post("/ingest")
async def trigger_ingestion(request: IngestRequest, background_tasks: BackgroundTasks):
    """Trigger data ingestion via separate process to prevent API freezing."""
    import subprocess
    import sys
    import os

    def run_ingestion_process():
        try:
            # Use the same python interpreter as the current process
            python_exe = sys.executable
            # Path to a script that runs the flow
            # For simplicity, we can use a small inline script or just run prefect_flows.py
            env = os.environ.copy()
            env["PYTHONPATH"] = f"{os.getcwd()}:{env.get('PYTHONPATH', '')}"
            
            # Create stop signal path
            from config.settings import get_settings
            signal_file = get_settings().duckdb_path.parent / "ingest_stop.signal"
            if signal_file.exists():
                signal_file.unlink()

            logger.info(f"Starting ingestion process: {request.mode}")
            state = {"status": "running", "step": f"Initializing {request.mode}...", "progress": 0, "details": ""}
            save_ingestion_state(state)
            
            # Simple wrapper to run the flow
            cmd = [
                python_exe, "-c", 
                f"from automation.prefect_flows import {request.mode}_sync_flow; {request.mode}_sync_flow()" if request.mode == "daily" else f"from automation.prefect_flows import historical_backfill_flow; historical_backfill_flow()"
            ]
            
            process = subprocess.Popen(cmd, env=env)
            process.wait()
            
            if process.returncode == 0:
                save_ingestion_state({"status": "completed", "step": f"Finished: {request.mode}", "progress": 100, "details": "Done"})
            else:
                save_ingestion_state({"status": "error", "step": "Failed", "progress": 0, "details": f"Process exited with code {process.returncode}"})
                
        except Exception as e:
            logger.error(f"Ingestion process failed: {e}")
            ingestion_state["status"] = "error"
            ingestion_state["details"] = str(e)

    background_tasks.add_task(run_ingestion_process)
    return {"status": "started", "message": f"Ingestion ({request.mode}) started in background process"}
