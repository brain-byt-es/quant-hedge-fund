from fastapi import APIRouter
from api.routers import data, backtest, ai, live, governance, status, research

api_router = APIRouter()

api_router.include_router(data.router, prefix="/data", tags=["data"])
api_router.include_router(backtest.router, prefix="/backtest", tags=["backtest"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(live.router, prefix="/live", tags=["live"])
api_router.include_router(governance.router, prefix="/governance", tags=["governance"])
api_router.include_router(status.router, prefix="/status", tags=["status"])
api_router.include_router(research.router, prefix="/research", tags=["research"])
