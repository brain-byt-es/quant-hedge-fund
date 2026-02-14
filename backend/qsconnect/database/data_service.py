"""
QS Connect - Data Service (Unified)
The sole owner of the DuckDB connection. All other processes (API, Ingestion)
must communicate with this service for both READ and WRITE operations.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from loguru import logger
import pandas as pd
import polars as pl
from pathlib import Path

from qsconnect.database.duckdb_manager import DuckDBManager
from config.settings import get_settings

app = FastAPI(title="Quant Science Data Service (Unified)")
db_mgr = None

class SQLCommand(BaseModel):
    sql: str
    params: Optional[List[Any]] = None

@app.on_event("startup")
def startup_event():
    global db_mgr
    settings = get_settings()
    # The Data Service is the SOLE process allowed to touch the file
    db_mgr = DuckDBManager(settings.duckdb_path, read_only=False)
    logger.info("Unified Data Service started. Ownership of quant.duckdb established.")

@app.on_event("shutdown")
def shutdown_event():
    if db_mgr:
        db_mgr.close()
        logger.info("Unified Data Service shutdown complete.")

@app.post("/query")
async def query_data(command: SQLCommand):
    """Execute a SELECT query and return results."""
    try:
        df = db_mgr.query(command.sql)
        # Convert to records for JSON transport
        return df.to_dicts()
    except Exception as e:
        logger.error(f"Query Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute")
async def execute_command(command: SQLCommand):
    """Execute a SQL command (INSERT/UPDATE/DELETE)."""
    try:
        db_mgr.execute(command.sql, command.params)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Write Execution Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upsert/prices")
async def upsert_prices(data: List[Dict[str, Any]]):
    """Bulk upsert price data."""
    try:
        df = pl.from_dicts(data)
        count = db_mgr.upsert_prices(df)
        return {"status": "success", "count": count}
    except Exception as e:
        logger.error(f"Price Upsert Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upsert/fundamentals")
async def upsert_fundamentals(payload: Dict[str, Any]):
    """Bulk upsert fundamental data."""
    try:
        df = pl.from_dicts(payload["data"])
        count = db_mgr.upsert_fundamentals(
            statement_type=payload["statement_type"],
            period=payload["period"],
            df=df
        )
        return {"status": "success", "count": count}
    except Exception as e:
        logger.error(f"Fundamental Upsert Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "service": "Quant Science Unified Data Service",
        "status": "online",
        "endpoints": ["/query", "/execute", "/upsert/prices", "/upsert/fundamentals", "/health"]
    }

@app.get("/health")
async def health_check():
    stats = db_mgr.get_table_stats() if db_mgr else []
    return {"status": "healthy", "tables": stats}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
