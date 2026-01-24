from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import data, research, live

app = FastAPI(
    title="Quant Science Platform API",
    description="Backend for the Hedge Fund in a Box platform. Wraps Zipline, Omega (IBKR), and DuckDB.",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:3000", # Next.js Frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(data.router, prefix="/api/data", tags=["Data Ingestion"])
app.include_router(research.router, prefix="/api/backtest", tags=["Research & Backtest"])
app.include_router(live.router, prefix="/api/live", tags=["Live Trading"])

@app.get("/")
def read_root():
    return {"status": "ok", "system": "Quant Science API v1"}
