from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Dict, Any
import asyncio
import json

# Use Singleton
from omega.singleton import get_omega_app

router = APIRouter()

class OrderRequest(BaseModel):
    symbol: str
    quantity: int
    side: str
    order_type: str = "MKT"

class BrokerConfigRequest(BaseModel):
    active_broker: str

@router.get("/status")
def get_live_status():
    app = get_omega_app()
    status = app.get_health_status()
    # Augment with broker info
    status["active_broker"] = getattr(app, "broker_type", "UNKNOWN")
    return status

@router.post("/config")
def configure_live_ops(config: BrokerConfigRequest):
    """Configure live operations (e.g. switch broker)."""
    app = get_omega_app()
    success = app.set_broker(config.active_broker)
    if success:
        return {"status": "updated", "active_broker": app.broker_type}
    else:
        raise HTTPException(status_code=500, detail="Failed to switch broker")

@router.get("/positions")
def get_positions():
    app = get_omega_app()
    return app.get_positions()

@router.get("/risk")
def get_portfolio_risk():
    """Get real-time risk metrics for the entire portfolio."""
    try:
        app = get_omega_app()
        positions = app.get_positions()
        account = app.get_account_summary() # Assumes this returns equity info
        
        total_equity = account.get("NetLiquidation", account.get("Equity", 100000.0))
        
        # Format positions for risk engine
        risk_positions = []
        for p in positions:
            risk_positions.append({
                "symbol": p["symbol"],
                "market_value": p["market_value"],
                "quantity": p["quantity"]
            })
            
        return app.risk_manager.get_portfolio_risk(risk_positions, total_equity)
    except Exception as e:
        from loguru import logger
        logger.error(f"Failed to fetch portfolio risk: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders")
def get_recent_orders(limit: int = 50):
    app = get_omega_app()
    return app.get_recent_orders(limit=limit)

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
            if app.is_connected() or True: 
                data = app.get_live_candles()
                if data:
                    await websocket.send_json({
                        "type": "candles",
                        "data": data,
                        "timestamp": asyncio.get_event_loop().time()
                    })
            
            # Send heartbeat/pnl updates
            status = app.get_health_status()
            await websocket.send_json({
                "type": "status",
                "data": status
            })

            await asyncio.sleep(1) # 1Hz update rate
    except WebSocketDisconnect:
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
