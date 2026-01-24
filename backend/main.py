from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from api.routers.main_router import api_router

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

app = FastAPI(title="QuantHedgeFund API")

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
    uvicorn.run(app, host="0.0.0.0", port=8000)
