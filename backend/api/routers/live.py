from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Dict, Any
from omega import TradingApp
import asyncio
import json

router = APIRouter()
omega_app = None

def get_omega_app():
    global omega_app
    if not omega_app:
        # Paper trading by default for safety
        omega_app = TradingApp(paper_trading=True)
    return omega_app

class OrderRequest(BaseModel):
    symbol: str
    quantity: int
    side: str
    order_type: str = "MKT"

@router.get("/status")
def get_live_status():
    app = get_omega_app()
    return app.get_health_status()

@router.get("/positions")
def get_positions():
    app = get_omega_app()
    return app.get_positions()

@router.websocket("/ws/ticks")
async def websocket_tick_stream(websocket: WebSocket):
    """
    Real-time tick stream for frontend charts.
    """
    await websocket.accept()
    app = get_omega_app()
    
    try:
        while True:
            # Poll for live candle updates
            # In a production event-driven system, we'd subscribe to a queue.
            # Here we poll the application state.
            if app.is_connected() or True: # Force true for demo even if disconnected from IB
                data = app.get_live_candles()
                if data:
                    await websocket.send_json({
                        "type": "candles",
                        "data": data,
                        "timestamp": asyncio.get_event_loop().time()
                    })
            
            # Send heartbeat/pnl updates
            # This mimics the "Daily P&L" ticker
            status = app.get_health_status()
            await websocket.send_json({
                "type": "status",
                "data": status
            })

            await asyncio.sleep(1) # 1Hz update rate
    except WebSocketDisconnect:
        # Client disconnected
        pass
    except Exception as e:
        print(f"WS Error: {e}")
        try:
            await websocket.close()
        except: pass

@router.post("/order")
def submit_order(order: OrderRequest):
    app = get_omega_app()
    trade = app.submit_order(order.model_dump())
    if trade:
        return {"status": "submitted", "order_id": str(trade.order.orderId)}
    else:
        raise HTTPException(status_code=400, detail="Order submission failed")

@router.post("/halt")
def emergency_halt():
    """Trigger emergency halt."""
    app = get_omega_app()
    app.halt()
    return {"status": "halted", "message": "Emergency halt triggered"}

@router.post("/resume")
def resume_trading():
    """Resume trading operations."""
    app = get_omega_app()
    app.resume()
    return {"status": "running", "message": "Trading resumed"}
