import asyncio
from datetime import datetime
import random

class OmegaService:
    """
    Wrapper for 'Omega' (Interactive Brokers API Wrapper).
    Handles live order routing and portfolio syncing.
    """
    
    def __init__(self):
        self.connected = False
        self.portfolio = {
            "cash": 15430.00,
            "equity": 1245392.00,
            "positions": [
                {"symbol": "AAPL", "quantity": 150, "avg_cost": 175.20, "current_price": 182.50},
                {"symbol": "MSFT", "quantity": 80, "avg_cost": 390.10, "current_price": 402.56},
                {"symbol": "SPY", "quantity": 200, "avg_cost": 480.00, "current_price": 495.20}
            ]
        }
        self.order_history = []

    async def connect(self):
        # Simulate IB Gateway handshake
        await asyncio.sleep(1)
        self.connected = True
        return {"status": "connected", "gateway_time": datetime.now().isoformat()}

    def get_portfolio(self):
        # Simulate slight price movements for "Live" feel
        for pos in self.portfolio["positions"]:
             change = random.uniform(-0.5, 0.5)
             pos["current_price"] = round(pos["current_price"] + change, 2)
        
        # Recalculate equity
        equity = self.portfolio["cash"] + sum(p["quantity"] * p["current_price"] for p in self.portfolio["positions"])
        self.portfolio["equity"] = round(equity, 2)
        
        return self.portfolio

    async def submit_order(self, order: dict):
        """
        order: { symbol: str, side: str, quantity: int, type: str }
        """
        # Simulate latency
        await asyncio.sleep(0.5)
        
        # Simple execution logic
        fill_price = 0
        # Mock price lookup
        mock_price = 150.00 + random.uniform(-2, 2) 
        
        execution_report = {
            "order_id": random.randint(10000, 99999),
            "symbol": order["symbol"],
            "side": order["side"],
            "quantity": order["quantity"],
            "status": "FILLED",
            "fill_price": round(mock_price, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        self.order_history.append(execution_report)
        
        # Update portfolio mock
        if order["side"] == "BUY":
            self.portfolio["cash"] -= execution_report["fill_price"] * order["quantity"]
            self.portfolio["positions"].append({
                "symbol": order["symbol"],
                "quantity": order["quantity"],
                "avg_cost": execution_report["fill_price"],
                "current_price": execution_report["fill_price"]
            })
        
        return execution_report

omega_service = OmegaService()
