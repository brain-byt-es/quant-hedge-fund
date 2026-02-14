import asyncio

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

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
async def get_live_status():
    app = get_omega_app()
    status = await app.get_health_status()
    
    # Risk V2: Augment with dynamic circuit breaker info
    # We calculate the current realized vol and regime-adjusted limit for the UI
    positions = await app.broker.get_positions()
    total_equity = status.get("net_liquidation", 0.0)
    realized_vol = app.risk_manager.calculate_portfolio_volatility(positions)
    
    regime = "Neutral"
    if app.active_strategy and "regime_snapshot" in app.active_strategy:
        regime = app.active_strategy["regime_snapshot"].get("regime_label", "Neutral")
        
    # Formula matched with backend halt logic
    z_score = 2.33
    regime_mult = app.risk_manager.get_market_regime_multiplier(regime)
    config_floor = app.risk_manager.limits.get("GLOBAL_LIMITS", {}).get("daily_loss_limit_usd", 5000.0)
    
    dynamic_limit = total_equity * realized_vol * z_score * regime_mult
    status["dynamic_loss_limit"] = float(max(dynamic_limit, config_floor))
    status["portfolio_volatility"] = float(realized_vol)
    status["market_regime"] = regime
    status["active_broker"] = getattr(app, "broker_type", "UNKNOWN")
    
    return status

@router.post("/config")
async def configure_live_ops(config: BrokerConfigRequest):
    """Configure live operations (e.g. switch broker)."""
    app = get_omega_app()
    success = await app.set_broker(config.active_broker)
    if success:
        return {"status": "updated", "active_broker": app.broker_type}
    else:
        raise HTTPException(status_code=500, detail="Failed to switch broker")

@router.get("/positions")
async def get_positions():
    app = get_omega_app()
    return await app.broker.get_positions()

@router.get("/risk")
async def get_portfolio_risk():
    """Get real-time risk metrics for the entire portfolio."""
    try:
        app = get_omega_app()
        positions = await app.broker.get_positions()
        account = await app.get_account_info()

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
async def get_recent_orders(limit: int = 50):
    app = get_omega_app()
    return await app.get_recent_orders(limit=limit)

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
            if app.is_connected():
                data = app.get_live_candles()
                if data:
                    await websocket.send_json({
                        "type": "candles",
                        "data": data,
                        "timestamp": asyncio.get_event_loop().time()
                    })

            # Send heartbeat/pnl updates
            status = await app.get_health_status()
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
async def submit_order(order: OrderRequest):
    app = get_omega_app()
    # Refactored TradingApp uses order_target_percent or submit_order
    # Using the refactored logic for lifecycle persistence
    try:
        # Check if we should use target percent or raw quantity
        # For simplicity, we use order_target_percent with current logic if it was a target order,
        # but here the request is a raw quantity.
        
        # We need a dedicated async submit_order in TradingApp or use broker directly
        trade = await app.broker.submit_order(
            symbol=order.symbol,
            quantity=order.quantity,
            side=order.side,
            order_type=order.order_type
        )
        
        if trade:
            return {"status": "submitted"}
        else:
            raise HTTPException(status_code=400, detail="Order submission failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
