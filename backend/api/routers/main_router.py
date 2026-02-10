from fastapi import APIRouter
from api.routers import data, backtest, ai, live, governance, status, research, tactical, search, screener

api_router = APIRouter()

api_router.include_router(data.router, prefix="/data", tags=["Data"])
api_router.include_router(search.router, prefix="/search", tags=["Global Search"])
api_router.include_router(screener.router, prefix="/screener", tags=["Stock Screener"])
api_router.include_router(research.router, prefix="/research", tags=["Research"])
api_router.include_router(backtest.router, prefix="/backtest", tags=["Backtest"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(live.router, prefix="/live", tags=["Live Trading"])
api_router.include_router(tactical.router, prefix="/tactical", tags=["Tactical"])
api_router.include_router(governance.router, prefix="/governance", tags=["Governance"])
api_router.include_router(status.router, prefix="/status", tags=["System Status"])
