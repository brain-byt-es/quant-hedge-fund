from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import date
import asyncio

# Import QuantHedgeFund modules
from qsconnect import Client as QSConnectClient
from qsresearch.backtest import run_backtest
from omega import TradingApp

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

app = FastAPI(title="QuantHedgeFund API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8501"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances (lazy loading recommended for production, but init here for simplicity)
# Note: In a real app, manage lifecycle (startup/shutdown) events.
qs_client = None
omega_app = None

@app.on_event("startup")
async def startup_event():
    global qs_client, omega_app
    try:
        logger.info("Initializing QS Connect Client...")
        qs_client = QSConnectClient() 
        logger.info("Initializing Omega Trading App...")
        # Paper trading by default
        omega_app = TradingApp(paper_trading=True) 
    except Exception as e:
        logger.error(f"Error initializing services: {e}")

@app.get("/")
def read_root():
    return {"status": "QuantHedgeFund Backend Running", "version": "2.0.0"}

# --- Data Endpoints (QS Connect) ---

@app.get("/api/data/status")
def get_data_status():
    """Get status of data services."""
    return {"status": "connected" if qs_client else "disconnected"}

class IngestRequest(BaseModel):
    start_date: str = "2020-01-01"
    end_date: str = None
    symbols: Optional[List[str]] = None

@app.post("/api/data/ingest")
async def trigger_ingestion(request: IngestRequest, background_tasks: BackgroundTasks):
    """Trigger data ingestion in background."""
    if not qs_client:
        raise HTTPException(status_code=503, detail="Data service unavailable")
    
    def run_ingestion():
        try:
            logger.info("Starting background ingestion...")
            qs_client.bulk_historical_prices(
                start_date=date.fromisoformat(request.start_date),
                symbols=request.symbols
            )
            qs_client.build_zipline_bundle("historical_prices_fmp")
            qs_client.ingest_bundle("historical_prices_fmp")
            logger.info("Background ingestion complete.")
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")

    background_tasks.add_task(run_ingestion)
    return {"message": "Ingestion started in background"}

# --- Research Endpoints (QS Research) ---

class BacktestConfig(BaseModel):
    bundle_name: str = "historical_prices_fmp"
    start_date: str
    end_date: str
    capital_base: float = 100000.0
    experiment_name: str = "API_Backtest"
    # Add other config fields as needed

@app.post("/api/backtest/run")
async def run_backtest_endpoint(config: BacktestConfig):
    """Run a backtest synchronously (for now)."""
    try:
        # Convert pydantic model to dict
        config_dict = config.model_dump()
        
        # Run backtest
        results = run_backtest(config_dict, log_to_mlflow=False) # Disable mlflow for simple API response for now
        
        # Sanitize results for JSON response (handle NaNs, dates, etc)
        metrics = results.get("metrics", {})
        return {"status": "success", "metrics": metrics}
    except Exception as e:
        logger.error(f"Backtest error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Live Trading Endpoints (Omega) ---

@app.get("/api/live/status")
def get_live_status():
    if not omega_app:
        return {"status": "uninitialized"}
    return omega_app.get_health_status()

@app.get("/api/live/positions")
def get_positions():
    if not omega_app:
        raise HTTPException(status_code=503, detail="Trading service unavailable")
    return omega_app.get_positions()

class OrderRequest(BaseModel):
    symbol: str
    quantity: int
    side: str
    order_type: str = "MKT"

@app.post("/api/live/order")
def submit_order(order: OrderRequest):
    if not omega_app:
        raise HTTPException(status_code=503, detail="Trading service unavailable")
    
    trade = omega_app.submit_order(order.model_dump())
    if trade:
        return {"status": "submitted", "order_id": str(trade.order.orderId)}
    else:
        raise HTTPException(status_code=400, detail="Order submission failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
