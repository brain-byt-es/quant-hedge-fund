from typing import Dict, List, Optional, Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from loguru import logger
from pydantic import BaseModel

from config.settings import get_settings
from qsconnect import Client as QSConnectClient

router = APIRouter()
qs_client = None

def get_qs_client(read_only: bool = True):
    """Singleton for QS Connect Client (Shared Process Connection)"""
    global qs_client
    if not qs_client:
        # API Workers are ALWAYS Read-Only to allow concurrency
        qs_client = QSConnectClient(read_only=True)
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
    """Get detailed health check of the data (gaps, outliers, anomalies)."""
    try:
        client = get_qs_client()
        return client.get_full_health_report()
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
def get_data_stats():
    """Get row counts for all tables."""
    try:
        client = get_qs_client()
        return client.get_table_stats()
    except Exception as e:
        logger.error(f"Stats check failed: {e}")
        return []

@router.post("/ingest/stop")
async def stop_ingestion():
    """Stop the running background ingestion."""
    client = get_qs_client()
    client.stop_requested = True
    state = load_ingestion_state()
    state["status"] = "idle"
    state["step"] = "Stopped by User"
    save_ingestion_state(state)
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

class QueryRequest(BaseModel):
    sql: str
    limit: int = 1000

@router.post("/query")
async def run_custom_query(request: QueryRequest):
    """Execute a custom SQL query against DuckDB (Read-Only)."""
    try:
        client = get_qs_client()
        # Force a limit for safety if not present
        sql = request.sql.strip()
        if "limit" not in sql.lower() and sql.lower().startswith("select"):
            sql += f" LIMIT {request.limit}"

        logger.info(f"Executing SQL Explorer query: {sql[:100]}...")
        df = client.query(sql)

        # Convert to list of dicts for JSON frontend
        return df.to_dicts()
    except Exception as e:
        logger.error(f"SQL Explorer error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ingest/sync")
async def trigger_unified_sync(background_tasks: BackgroundTasks):
    """Trigger the Institutional Unified Sync (Task 7)."""
    
    async def run_sync():
        try:
            from qsconnect.ingestion.sync_coordinator import UnifiedSyncCoordinator
            client = get_qs_client()
            client.stop_requested = False
            
            save_ingestion_state({"status": "running", "step": "SotW Analysis", "progress": 10, "details": "Analyzing Gaps..."})
            
            coordinator = UnifiedSyncCoordinator(client)
            stats = await coordinator.sync_all()
            
            save_ingestion_state({
                "status": "completed", 
                "step": "Sync Complete", 
                "progress": 100, 
                "details": f"Added {stats.get('new_prices', 0)} prices and {stats.get('new_financials', 0)} financials."
            })
        except Exception as e:
            logger.error(f"Unified Sync failed: {e}")
            save_ingestion_state({"status": "error", "step": "Failed", "progress": 0, "details": str(e)})

    background_tasks.add_task(run_sync)
    return {"status": "started", "message": "Unified Institutional Sync started."}

class IngestRequest(BaseModel):
    mode: str = "daily" # 'daily', 'backfill', or 'simfin'
    start_date: Optional[str] = None
    symbols: Optional[List[str]] = None

@router.post("/ingest")
async def trigger_ingestion(request: IngestRequest, background_tasks: BackgroundTasks):
    """Legacy/Individual ingestion trigger."""

    def run_ingestion():
        client = get_qs_client()
        try:
            from automation.prefect_flows import (
                daily_sync_flow,
                historical_backfill_flow,
                simfin_bulk_flow,
            )

            # Reset stop signal
            client.stop_requested = False

            logger.info(f"Starting background ingestion: {request.mode}")
            save_ingestion_state({"status": "running", "step": f"Initializing {request.mode}...", "progress": 0, "details": ""})

            if request.mode == "daily":
                daily_sync_flow()
            elif request.mode == "simfin":
                simfin_bulk_flow()
            else:
                historical_backfill_flow()

            save_ingestion_state({"status": "completed", "step": f"Finished: {request.mode}", "progress": 100, "details": "Done"})
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            save_ingestion_state({"status": "error", "step": "Failed", "progress": 0, "details": str(e)})

    background_tasks.add_task(run_ingestion)
    return {"status": "started", "message": f"Ingestion ({request.mode}) started in background thread"}
