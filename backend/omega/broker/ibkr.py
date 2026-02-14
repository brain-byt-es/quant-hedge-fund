from typing import Any, Dict, List, Optional

from loguru import logger

from .base import BaseBroker


class IBBroker(BaseBroker):
    def __init__(self, host: str, port: int, client_id: int):
        self.host = host
        self.port = port
        self.client_id = client_id
        self._ib = None
        self._connected = False

    def connect(self) -> bool:
        try:
            import nest_asyncio
            nest_asyncio.apply()

            from ib_insync import IB
            if self._ib is None:
                try:
                    self._ib = IB()
                except Exception as e:
                    logger.error(f"IB Instantiation Error: {e}")
                    self._ib = None
                    return False

            if not self._ib.isConnected():
                self._ib.connect(self.host, self.port, self.client_id)

            self._connected = True
            return True
        except RuntimeError as e:
            if "attached to a different loop" in str(e):
                logger.warning(f"IBKR Event Loop Conflict (AsyncIO): {e}. IBKR features unavailable in this mode.")
            else:
                logger.error(f"IB Connect Runtime Error: {e}")
            self._connected = False
            return False
        except Exception as e:
            logger.error(f"IB Connect Error: {e}")
            self._connected = False
            return False

    def is_connected(self) -> bool:
        return self._connected and self._ib and self._ib.isConnected()

    def get_account_info(self) -> Dict[str, Any]:
        if not self.is_connected(): return {}
        try:
            vals = self._ib.accountValues()
            info = {}
            for av in vals:
                if av.tag in ["NetLiquidation", "TotalCashValue", "BuyingPower", "GrossPositionValue"]:
                    info[av.tag] = float(av.value)
            return info
        except Exception as e:
            logger.error(f"IB Account Info Error: {e}")
            return {}

    def get_positions(self) -> List[Dict[str, Any]]:
        if not self.is_connected(): return []
        try:
            positions = []
            for pos in self._ib.positions():
                avg = pos.avgCost or 0.0
                qty = pos.position
                # Note: Skipping real-time price fetch for simplicity in this port
                # Ideally reuse the reqMktData logic from original TradingApp
                current_price = avg
                positions.append({
                    "symbol": pos.contract.symbol,
                    "quantity": qty,
                    "avg_cost": avg,
                    "current_price": current_price,
                    "market_value": qty * current_price,
                    "unrealized_pnl": 0.0 # simplified
                })
            return positions
        except Exception as e:
            logger.error(f"IB Positions Error: {e}")
            return []

    def get_quote(self, symbol: str) -> Dict[str, float]:
        if not self.is_connected(): return {"bid":0.0, "ask":0.0, "last":0.0}
        try:
            from ib_insync import Stock
            contract = Stock(symbol, "SMART", "USD")
            t = self._ib.reqMktData(contract)
            self._ib.sleep(0.5)
            return {"bid": t.bid or 0.0, "ask": t.ask or 0.0, "last": t.last or 0.0, "volume": t.volume or 0}
        except Exception as e:
            logger.error(f"IB Quote Error: {e}")
            return {"bid":0.0, "ask":0.0, "last":0.0}

    def submit_order(self, symbol: str, quantity: int, side: str, order_type: str, price: float = None) -> Optional[Any]:
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
                # Adaptive Algo
                # Note: Adaptive requires a price (usually current market or limit)
                # If price is None, we can't really do a Limit Adaptive safely without more context
                # For safety, if no price, default to MKT or fail?
                # Let's assume price is provided or we use MKT Adaptive if supported (it is usually Limit)
                if price:
                    order = LimitOrder(action, qty, price)
                    order.algoStrategy = "Adaptive"
                    order.algoParams = [("adaptivePriority", "Normal")]
                else:
                    # Fallback to Market Adaptive? Or just Market.
                    # IBKR Adaptive usually works best as Limit.
                    order = MarketOrder(action, qty)
                    order.algoStrategy = "Adaptive"
                    order.algoParams = [("adaptivePriority", "Normal")]
            elif ot == "VWAP":
                # VWAP Algo
                order = AlgoOrder(
                    action=action,
                    totalQuantity=qty,
                    algoStrategy="Vwap",
                    algoParams=[
                        ("startTime", ""), # Now
                        ("endTime", ""), # Market Close
                        ("maxPctVol", 0.05), # Max 5% of volume
                        ("noTakeLiq", False)
                    ]
                )
            elif ot == "TWAP":
                # TWAP Algo
                order = AlgoOrder(
                    action=action,
                    totalQuantity=qty,
                    algoStrategy="Twap",
                    algoParams=[
                        ("startTime", ""),
                        ("endTime", ""),
                        ("strategyType", "Marketable")
                    ]
                )
            else:
                # Default Limit or Market
                if price:
                    order = LimitOrder(action, qty, price)
                else:
                    order = MarketOrder(action, qty)

            trade = self._ib.placeOrder(contract, order)
            logger.info(f"IBKR Order Submitted: {ot} {action} {qty} {symbol}")
            return trade
        except Exception as e:
            logger.error(f"IB Order Error: {e}")
            return None

    def get_open_orders(self) -> List[Dict[str, Any]]:
        if not self.is_connected(): return []
        orders = []
        for t in self._ib.openTrades():
            orders.append({
                "symbol": t.contract.symbol,
                "action": t.order.action,
                "quantity": t.order.totalQuantity,
                "status": t.orderStatus.status,
                "created_at": None # IBKR doesn't give simple timestamp on order
            })
        return orders

    def get_recent_orders(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.is_connected(): return []
        # ib.trades() returns recent trades from the current session
        trades = self._ib.trades()
        # Sort by fill time or orderId if possible
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
                "created_at": None # Requires more complex logging for history
            })
        return normalized

    def cancel_all_orders(self) -> int:
        if not self.is_connected(): return 0
        try:
            trades = self._ib.openTrades()
            for t in trades:
                self._ib.cancelOrder(t.order)
            return len(trades)
        except Exception:
            return 0
