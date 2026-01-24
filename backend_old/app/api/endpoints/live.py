from fastapi import APIRouter, WebSocket, HTTPException
from pydantic import BaseModel
from app.services.omega_service import omega_service
import asyncio

router = APIRouter()

class OrderRequest(BaseModel):
    symbol: str
    side: str # BUY / SELL
    quantity: int
    type: str # MARKET / LIMIT
    limit_price: float = 0.0

@router.get("/portfolio")
async def get_portfolio():
    return omega_service.get_portfolio()

@router.post("/order")
async def submit_order(order: OrderRequest):
    try:
        report = await omega_service.submit_order(order.dict())
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.websocket("/stream")
async def websocket_live_stream(websocket: WebSocket):
    """
    Streams real-time P&L and market data.
    """
    await websocket.accept()
    try:
        while True:
            # Send portfolio updates every 500ms
            data = omega_service.get_portfolio()
            await websocket.send_json({
                "type": "portfolio_update",
                "data": data,
                "timestamp": asyncio.get_event_loop().time()
            })
            await asyncio.sleep(0.5)
    except Exception:
        pass
