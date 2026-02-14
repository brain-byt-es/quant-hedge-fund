from typing import Any, Dict, List, Optional
import asyncio
from loguru import logger

from .base import BaseBroker


class IBBroker(BaseBroker):
    def __init__(self, host: str, port: int, client_id: int):
        self.host = host
        self.port = port
        self.client_id = client_id
        self._ib = None
        self._connected = False

    async def connect(self) -> bool:
        try:
            from ib_insync import IB
            if self._ib is None:
                try:
                    self._ib = IB()
                except Exception as e:
                    logger.error(f"IB Instantiation Error: {e}")
                    self._ib = None
                    return False

            if not self._ib.isConnected():
                # Use connectAsync for native asyncio support
                await self._ib.connectAsync(self.host, self.port, self.client_id)

            self._connected = True
            logger.info(f"Connected to IBKR at {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"IB Connect Error: {e}")
            self._connected = False
            return False

    def is_connected(self) -> bool:
        return self._connected and self._ib and self._ib.isConnected()

    async def get_account_info(self) -> Dict[str, Any]:
        if not self.is_connected(): return {}
        try:
            # reqAccountSummary or similar if real-time needed, 
            # for now using cached accountValues
            vals = self._ib.accountValues()
            info = {}
            for av in vals:
                if av.tag in ["NetLiquidation", "TotalCashValue", "BuyingPower", "GrossPositionValue"]:
                    info[av.tag] = float(av.value)
            return info
        except Exception as e:
            logger.error(f"IB Account Info Error: {e}")
            return {}

    async def get_positions(self) -> List[Dict[str, Any]]:
        if not self.is_connected(): return []
        try:
            positions = []
            for pos in self._ib.positions():
                avg = pos.avgCost or 0.0
                qty = pos.position
                current_price = avg # Simplified
                positions.append({
                    "symbol": pos.contract.symbol,
                    "quantity": qty,
                    "avg_cost": avg,
                    "current_price": current_price,
                    "market_value": qty * current_price,
                    "unrealized_pnl": 0.0
                })
            return positions
        except Exception as e:
            logger.error(f"IB Positions Error: {e}")
            return []

    async def get_quote(self, symbol: str) -> Dict[str, float]:
        if not self.is_connected(): return {"bid":0.0, "ask":0.0, "last":0.0}
        try:
            from ib_insync import Stock
            contract = Stock(symbol, "SMART", "USD")
            t = self._ib.reqMktData(contract)
            # Short wait for data to populate
            await asyncio.sleep(0.5)
            return {"bid": t.bid or 0.0, "ask": t.ask or 0.0, "last": t.last or 0.0, "volume": t.volume or 0}
        except Exception as e:
            logger.error(f"IB Quote Error: {e}")
            return {"bid":0.0, "ask":0.0, "last":0.0}

    async def submit_order(self, symbol: str, quantity: int, side: str, order_type: str, price: float = None) -> Optional[Any]:
        if not self.is_connected(): return None
        try:
            from ib_insync import AlgoOrder, LimitOrder, MarketOrder, Stock
            contract = Stock(symbol, "SMART", "USD")

            order = None
            action = side.upper()
            qty = abs(quantity)
            ot = order_type.upper()

            if ot == "MKT":
                order = MarketOrder(action, qty)
            elif ot == "ADAPTIVE":
                if price:
                    order = LimitOrder(action, qty, price)
                    order.algoStrategy = "Adaptive"
                    order.algoParams = [("adaptivePriority", "Normal")]
                else:
                    order = MarketOrder(action, qty)
                    order.algoStrategy = "Adaptive"
                    order.algoParams = [("adaptivePriority", "Normal")]
            elif ot == "VWAP":
                order = AlgoOrder(
                    action=action,
                    totalQuantity=qty,
                    algoStrategy="Vwap",
                    algoParams=[("startTime", ""), ("endTime", ""), ("maxPctVol", 0.05), ("noTakeLiq", False)]
                )
            else:
                if price: order = LimitOrder(action, qty, price)
                else: order = MarketOrder(action, qty)

            trade = self._ib.placeOrder(contract, order)
            logger.info(f"IBKR Order Submitted: {ot} {action} {qty} {symbol}")
            return trade
        except Exception as e:
            logger.error(f"IB Order Error: {e}")
            return None

    async def get_open_orders(self) -> List[Dict[str, Any]]:
        if not self.is_connected(): return []
        orders = []
        for t in self._ib.openTrades():
            orders.append({
                "symbol": t.contract.symbol,
                "action": t.order.action,
                "quantity": t.order.totalQuantity,
                "status": t.orderStatus.status,
                "created_at": None
            })
        return orders

    async def get_recent_orders(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.is_connected(): return []
        trades = self._ib.trades()
        normalized = []
        for t in trades[-limit:]:
            normalized.append({
                "id": str(t.order.orderId),
                "symbol": t.contract.symbol,
                "action": t.order.action,
                "quantity": float(t.order.totalQuantity),
                "filled_qty": float(t.orderStatus.filled),
                "avg_fill_price": float(t.orderStatus.avgFillPrice),
                "order_type": t.order.orderType,
                "status": t.orderStatus.status,
                "created_at": None
            })
        return normalized

    async def cancel_all_orders(self) -> int:
        if not self.is_connected(): return 0
        try:
            trades = self._ib.openTrades()
            for t in trades:
                self._ib.cancelOrder(t.order)
            return len(trades)
        except Exception:
            return 0
