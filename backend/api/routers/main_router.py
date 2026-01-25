from fastapi import APIRouter
from api.routers import data, backtest, live, status

api_router = APIRouter()

api_router.include_router(data.router, prefix="/data", tags=["data"])
api_router.include_router(backtest.router, prefix="/backtest", tags=["backtest"])
api_router.include_router(live.router, prefix="/live", tags=["live"])
api_router.include_router(status.router, prefix="/status", tags=["status"])
