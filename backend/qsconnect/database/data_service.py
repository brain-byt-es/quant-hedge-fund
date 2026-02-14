"""
QS Connect - Data Service (Writer)
A dedicated microservice that owns the Read-Write connection to DuckDB.
Ensures all INSERT/UPDATE/DELETE operations are serialized and prevent file locking.
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

app = FastAPI(title="Quant Science Data Service (Writer)")
db_mgr = None

class SQLCommand(BaseModel):
    sql: str
    params: Optional[List[Any]] = None

@app.on_event("startup")
def startup_event():
    global db_mgr
    settings = get_settings()
    # The Data Service is the SOLE WRITER
    db_mgr = DuckDBManager(settings.duckdb_path, read_only=False)
    logger.info("Data Service (Writer) started and DuckDB RW connection initialized.")

@app.on_event("shutdown")
def shutdown_event():
    if db_mgr:
        db_mgr.close()
        logger.info("Data Service (Writer) shutdown complete.")

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

@app.get("/health")
async def health_check():
    return {"status": "healthy", "mode": "writer"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
