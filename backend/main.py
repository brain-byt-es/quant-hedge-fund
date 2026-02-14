import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers.data import get_qs_client
from api.routers.main_router import api_router
from omega.singleton import get_omega_app

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        logger.info("Initializing Services...")
        
        # Initialize Data Client early
        client = get_qs_client()
        
        # Initialize Omega Engine (Async Connection)
        omega = get_omega_app()
        await omega.connect()

        # System Heartbeat Logging
        client.log_event("INFO", "System", "Quant Hedge Fund Platform: Neural Bridge Established.")
        client.log_event("INFO", "Omega", "Async Execution Layer online.")
        client.log_event("INFO", "Research", "Research Lab data connectors active.")

    except Exception as e:
        logger.error(f"Error initializing services: {e}")

    yield

    # Shutdown
    logger.info("Shutting down services...")
    try:
        client = get_qs_client()
        client.stop_requested = True
        logger.info("Sent stop signal to background tasks.")
        client.close()
        logger.info("Data Client proxy detached.")
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
    return {"status": "QuantHedgeFund Backend Running", "version": "2.2.0 (Async Omega)"}

if __name__ == "__main__":
    import uvicorn
    # Now we can scale to multiple workers because locks are handled by Data Service
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
