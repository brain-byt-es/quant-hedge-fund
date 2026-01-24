from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date
from loguru import logger
import duckdb

from config.settings import get_settings
from qsconnect import Client as QSConnectClient

router = APIRouter()
qs_client = None # For write operations (ingestion)

def get_qs_client_writer():
    """Singleton for write operations (Ingestion only)"""
    global qs_client
    if not qs_client:
        qs_client = QSConnectClient()
    return qs_client

def get_db_read_only():
    """Dependency for Read-Only Database Access (Non-blocking)"""
    settings = get_settings()
    # Explicit read_only=True allows multiple readers alongside one writer (Omega)
    conn = duckdb.connect(database=str(settings.duckdb_path), read_only=True)
    try:
        yield conn
    finally:
        conn.close()

class IngestRequest(BaseModel):
    start_date: str = "2020-01-01"
    end_date: Optional[str] = None
    symbols: Optional[List[str]] = None

@router.get("/status")
def get_data_status():
    """Get status of data services."""
    # Simple check if DB file exists and is readable
    try:
        settings = get_settings()
        if settings.duckdb_path.exists():
             return {"status": "connected", "path": str(settings.duckdb_path)}
        return {"status": "disconnected", "error": "DB file not found"}
    except Exception as e:
        return {"status": "error", "details": str(e)}

@router.get("/prices/latest")
async def get_latest_prices(
    symbols: Optional[str] = None, 
    limit: int = 100, 
    db: duckdb.DuckDBPyConnection = Depends(get_db_read_only)
):
    """
    Get latest prices for dashboard (Read-Only).
    Prevents locking conflicts with Omega writer.
    """
    try:
        query = """
            SELECT symbol, date, close, volume, change_percent 
            FROM prices 
            WHERE date = (SELECT MAX(date) FROM prices)
        """
        
        if symbols:
            # Safe parameterization handled by DuckDB python API usually, 
            # but for IN clause with string split it's manual or prepared statement.
            # Simplified for now:
            symbol_list = [s.strip() for s in symbols.split(",")]
            formatted_list = "', '".join(symbol_list)
            query += f" AND symbol IN ('{formatted_list}')"
            
        query += f" LIMIT {limit}"
        
        # Execute and fetch as Polars -> Dicts
        df = db.execute(query).pl()
        return df.to_dicts()
        
    except Exception as e:
        logger.error(f"Read-only DB query failed: {e}")
        # Return empty list gracefully or raise HTTP error depending on strictness
        raise HTTPException(status_code=500, detail="Database query failed")

@router.post("/ingest")
async def trigger_ingestion(request: IngestRequest, background_tasks: BackgroundTasks):
    """Trigger data ingestion in background (Requires Write Lock)."""
    # Uses the global writer client
    client = get_qs_client_writer()
    
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
