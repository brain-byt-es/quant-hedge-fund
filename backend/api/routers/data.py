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
            
            # Phase 1: Stock List
            ingestion_state["step"] = "Downloading Stock List"
            stock_list = client._fmp_client.get_stock_list()
            client._db_manager.upsert_stock_list(stock_list)
            
            # Phase 2: Historical Prices
            ingestion_state["step"] = "Downloading Prices (FMP)"
            prices = client.bulk_historical_prices(
                start_date=date.fromisoformat(request.start_date) if request.start_date else None,
                end_date=date.fromisoformat(request.end_date) if request.end_date else None,
                symbols=request.symbols,
                progress_callback=update_progress
            )
            
            # Phase 3: Annual Fundamentals (Starter Plan Mode)
            # Fetching fundamentals for all US symbols can take hours due to rate limits.
            # We fetch for all symbols in the current universe.
            fundamental_types = ["income-statement", "balance-sheet-statement", "cash-flow-statement", "ratios", "key-metrics"]
            us_symbols = client._fmp_client.get_stock_list()["symbol"].tolist()
            
            for stmt in fundamental_types:
                # Check for stop signal between statement types
                if client.stop_requested:
                    logger.warning("Ingestion stopped by user between phases.")
                    break

                ingestion_state["step"] = f"Ingesting: {stmt} (US Annual)"
                ingestion_state["progress"] = 0
                
                # Fetching pro-symbol (No bulk)
                data = client._fmp_client.get_starter_fundamentals(
                    symbols=us_symbols,
                    statement_type=stmt,
                    limit=5, # Last 5 years
                    stop_check=lambda: client.stop_requested,
                    progress_callback=update_progress
                )
                
                if not data.is_empty():
                    client._db_manager.upsert_fundamentals(stmt, "annual", data)
            
            if client.stop_requested:
                ingestion_state["status"] = "idle"
                ingestion_state["step"] = "Stopped"
                return
            
            # Phase 4: Zipline Bundle
            ingestion_state["step"] = "Bundling Zipline Data"
            client.build_zipline_bundle("historical_prices_fmp")
            
            # Phase 5: Ingest Bundle
            client.ingest_bundle("historical_prices_fmp")
            
            # Phase 6: Company Profiles
            ingestion_state["step"] = "Downloading Company Profiles"
            profiles_json = client._fmp_client._make_request("https://financialmodelingprep.com/stable/profile-bulk?part=0")
            if profiles_json:
                import pandas as pd
                profiles_df = pd.DataFrame(profiles_json)
                client._db_manager.upsert_company_profiles(profiles_df)
            
            ingestion_state["status"] = "completed"
            ingestion_state["step"] = "All Data Synced"
            ingestion_state["step"] = "All Data Synced"
            logger.info("Background ingestion complete.")
            
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            ingestion_state["status"] = "error"
            ingestion_state["details"] = str(e)

    background_tasks.add_task(run_ingestion)
    return {"status": "started", "message": "Ingestion started in background"}
