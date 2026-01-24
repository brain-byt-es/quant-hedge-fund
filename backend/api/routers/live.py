from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from omega import TradingApp

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
