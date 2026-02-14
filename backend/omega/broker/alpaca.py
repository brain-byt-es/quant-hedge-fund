from typing import Any, Dict, List, Optional

import alpaca_trade_api as tradeapi
from loguru import logger

from .base import BaseBroker


class AlpacaBroker(BaseBroker):
    def __init__(self, api_key: str, secret_key: str, paper: bool = True, base_url: str = ""):
        self.api_key = api_key
        self.secret_key = secret_key

        # Priority: 1. Manual Base URL from .env, 2. Logic based on paper flag
        if base_url:
            self.base_url = base_url
        else:
            self.base_url = "https://paper-api.alpaca.markets" if paper else "https://api.alpaca.markets"

        self._api = None
        self._connected = False

    def connect(self) -> bool:
        try:
            # Clean base_url: Remove trailing /v2 if present to avoid duplication by SDK
            clean_url = self.base_url.rstrip("/")
            if clean_url.endswith("/v2"):
                clean_url = clean_url[:-3]

            self._api = tradeapi.REST(
                self.api_key,
                self.secret_key,
                clean_url,
                api_version='v2'
            )
            # Test connection
            self._api.get_account()
            self._connected = True
            logger.info("Connected to Alpaca")
            return True
        except Exception as e:
            logger.error(f"Alpaca connection failed: {e}")
            self._connected = False
            return False

    def is_connected(self) -> bool:
        return self._connected

    def get_account_info(self) -> Dict[str, Any]:
        if not self._connected: return {}
        try:
            acct = self._api.get_account()
            equity = float(acct.equity)
            last_equity = float(acct.last_equity)
            daily_pnl = equity - last_equity

            return {
                "NetLiquidation": equity,
                "BuyingPower": float(acct.buying_power),
                "Cash": float(acct.cash),
                "Currency": acct.currency,
                "DailyPnL": daily_pnl
            }
        except Exception as e:
            logger.error(f"Alpaca account info error: {e}")
            return {}

    def get_positions(self) -> List[Dict[str, Any]]:
        if not self._connected: return []
        try:
            positions = self._api.list_positions()
            return [{
                "symbol": p.symbol,
                "quantity": float(p.qty),
                "avg_cost": float(p.avg_entry_price),
                "current_price": float(p.current_price),
                "market_value": float(p.market_value),
                "unrealized_pnl": float(p.unrealized_pl),
                "asset_class": p.asset_class
            } for p in positions]
        except Exception as e:
            logger.error(f"Alpaca positions error: {e}")
            return []

    def get_quote(self, symbol: str) -> Dict[str, float]:
        if not self._connected: return {"bid": 0.0, "ask": 0.0, "last": 0.0}
        try:
            # Note: Alpaca v2 requires explicit data subscription for real-time
            # Using get_latest_trade/quote for snapshot
            quote = self._api.get_latest_quote(symbol)
            trade = self._api.get_latest_trade(symbol)
            return {
                "bid": float(quote.bp),
                "ask": float(quote.ap),
                "last": float(trade.p),
                "volume": 0 # Snapshot often lacks daily vol context without bar data
            }
        except Exception as e:
            logger.error(f"Alpaca quote error for {symbol}: {e}")
            return {"bid": 0.0, "ask": 0.0, "last": 0.0}

    def submit_order(self, symbol: str, quantity: int, side: str, order_type: str, price: float = None) -> Optional[Any]:
        if not self._connected: return None
        try:
            side = side.lower()
            type_map = {"MKT": "market", "LMT": "limit"}
            alpaca_type = type_map.get(order_type.upper(), "market")

            order = self._api.submit_order(
                symbol=symbol,
                qty=abs(quantity),
                side=side,
                type=alpaca_type,
                time_in_force='day',
                limit_price=price if alpaca_type == "limit" else None
            )
            logger.info(f"Alpaca Order Submitted: {side} {quantity} {symbol}")
            return order
        except Exception as e:
            logger.error(f"Alpaca order failed: {e}")
            return None

    def get_open_orders(self) -> List[Dict[str, Any]]:
        if not self._connected: return []
        try:
            orders = self._api.list_orders(status='open')
            return [{
                "symbol": o.symbol,
                "action": o.side.upper(),
                "quantity": float(o.qty),
                "order_type": o.type.upper(),
                "status": o.status,
                "created_at": o.created_at.isoformat()
            } for o in orders]
        except Exception as e:
            logger.error(f"Alpaca open orders error: {e}")
            return []

    def get_recent_orders(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self._connected: return []
        try:
            orders = self._api.list_orders(status='all', limit=limit)
            return [{
                "id": o.id,
                "symbol": o.symbol,
                "action": o.side.upper(),
                "quantity": float(o.qty),
                "filled_qty": float(o.filled_qty),
                "avg_fill_price": float(o.filled_avg_price) if o.filled_avg_price else 0.0,
                "order_type": o.type.upper(),
                "status": o.status,
                "created_at": o.created_at.isoformat(),
                "updated_at": o.updated_at.isoformat() if o.updated_at else None
            } for o in orders]
        except Exception as e:
            logger.error(f"Alpaca recent orders error: {e}")
            return []

    def cancel_all_orders(self) -> int:
        if not self._connected: return 0
        try:
            self._api.cancel_all_orders()
            logger.info("Cancelled all Alpaca orders")
            return 1 # Alpaca doesn't return count easily on cancel_all
        except Exception as e:
            logger.error(f"Alpaca cancel error: {e}")
            return 0
