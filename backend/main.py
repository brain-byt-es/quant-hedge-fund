from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from api.routers.main_router import api_router
from api.routers.data import get_qs_client
from omega.singleton import get_omega_app

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        logger.info("Initializing Services...")
        # Force initialization of Omega Singleton
        get_omega_app()
        # Initialize Data Client early
        client = get_qs_client()
        
        # System Heartbeat Logging
        client.log_event("INFO", "System", "Quant Hedge Fund Platform: Neural Bridge Established.")
        client.log_event("INFO", "Omega", "Execution Layer Singletons online.")
        client.log_event("INFO", "Research", "Research Lab data connectors active.")
        
    except Exception as e:
        logger.error(f"Error initializing services: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down services...")
    try:
        client = get_qs_client()
        client.stop_requested = True # Trigger the Kill Switch
        logger.info("Sent stop signal to background tasks.")
        client.close() # Closes DuckDB connection
        logger.info("DuckDB connection closed.")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

app = FastAPI(title="QuantHedgeFund API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8501"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "QuantHedgeFund Backend Running", "version": "2.1.0"}

if __name__ == "__main__":
    import uvicorn
    # workers=1 is critical for Singleton/DuckDB lock safety in simple setup
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
