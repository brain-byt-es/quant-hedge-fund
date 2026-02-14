"""
Omega - Trading Application

Main trading application for executing trades via Interactive Brokers.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from loguru import logger

from config.registry import get_registry
from config.settings import get_settings
from omega.data.candle_engine import BarCloseEventBus, CandleAggregator
from omega.risk_engine import RiskManager
from qsresearch.governance.manager import GovernanceManager


class PortfolioState:
    """Snapshot of current portfolio state."""
    def __init__(self, positions: List[Dict], account: Dict[str, Any]):
        self.positions = positions
        self.account = account
        # Ensure total_equity is accessible directly
        self.total_equity = float(account.get("NetLiquidation", 0.0) or 0.0)


class TradingApp:
    """
    Main trading application for Omega.
    
    Provides interface to Interactive Brokers for:
    - Account management
    - Position tracking
    - Order execution
    - Market data retrieval
    
    Example:
        >>> from omega import TradingApp
        >>> app = TradingApp()
        >>> positions = app.get_positions()
        >>> app.order_target_percent("AAPL", 0.05)
    """

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        client_id: Optional[int] = None,
        paper_trading: bool = True,
    ):
        """
        Initialize the trading application.
        
        Args:
            host: IB Gateway host (default from settings)
            port: IB Gateway port (default from settings)
            client_id: Client ID for connection
            paper_trading: Whether to use paper trading mode
        """
        settings = get_settings()

        self.host = host or settings.ib_host
        self.port = port or settings.ib_port
        self.client_id = client_id or settings.ib_client_id
        self.paper_trading = paper_trading

        self._connected = False
        self._ib = None
        self._halted = False  # Critical safety flag

        # Broker Adapter Strategy
        self.broker_type = settings.active_broker.upper()
        self.broker = None

        if self.broker_type == "ALPACA":
            from omega.broker.alpaca import AlpacaBroker
            self.broker = AlpacaBroker(
                settings.alpaca_api_key,
                settings.alpaca_secret_key,
                settings.alpaca_paper,
                settings.alpaca_base_url
            )
            logger.info("Initialized Alpaca Broker Adapter")
        else:
            from omega.broker.ibkr import IBBroker
            self.broker = IBBroker(self.host, self.port, self.client_id)
            logger.info("Initialized IBKR Broker Adapter")

        # Governance & Strategy Layer
        if not hasattr(self, '_db_manager'):
            from qsconnect.database.duckdb_manager import DuckDBManager
            # TradingApp is a READER in the API process
            self._db_manager = DuckDBManager(settings.duckdb_path, read_only=True)

        from qsconnect.database.remote_writer import RemoteWriter
        self._writer = RemoteWriter()
        
        self.gov = GovernanceManager(self._db_manager)
        self.registry = get_registry()
        self.risk_manager = RiskManager()
        self.active_strategy: Optional[Dict[str, Any]] = None

        # --- Phase 3: Candle Truth Layer ---
        self.event_bus = BarCloseEventBus()
        self.aggregators: Dict[str, CandleAggregator] = {}

        # Telemetry & Metrics
        self.metrics = {
            "last_tick_time": None,
            "last_order_time": None,
            "order_latencies": [],
            "daily_pnl_initial_value": None
        }

        logger.info(
            f"TradingApp initialized: {self.host}:{self.port} "
            f"(paper={self.paper_trading})"
        )

    def set_broker(self, broker_type: str) -> bool:
        """
        Dynamically switch the active broker.
        """
        settings = get_settings()
        broker_type = broker_type.upper()

        if broker_type == self.broker_type and self.is_connected():
            return True

        logger.info(f"Switching broker from {self.broker_type} to {broker_type}...")

        # Disconnect current
        if self.is_connected():
            self.disconnect()

        try:
            if broker_type == "ALPACA":
                from omega.broker.alpaca import AlpacaBroker
                self.broker = AlpacaBroker(
                    settings.alpaca_api_key,
                    settings.alpaca_secret_key,
                    settings.alpaca_paper,
                    settings.alpaca_base_url
                )
            elif broker_type == "IBKR":
                from omega.broker.ibkr import IBBroker
                self.broker = IBBroker(self.host, self.port, self.client_id)
            else:
                logger.error(f"Unknown broker type: {broker_type}")
                return False

            self.broker_type = broker_type

            # Connect new
            if self.connect():
                logger.info(f"Successfully switched to {broker_type}")
                return True
            else:
                logger.error(f"Failed to connect to {broker_type}")
                return False

        except Exception as e:
            logger.error(f"Broker switch failed: {e}")
            return False

    # =====================
    # Connection Management
    # =====================

    def connect(self) -> bool:
        """Connect to the active broker."""
        return self.broker.connect()

    def disconnect(self) -> None:
        """Disconnect from active broker."""
        # Adapter pattern doesn't strictly enforce disconnect, but good practice
        pass

    def is_connected(self) -> bool:
        """Check if connected to broker."""
        return self.broker.is_connected()

    def halt(self) -> None:
        """Emergency halt all trading activity."""
        self._halted = True
        logger.warning("TRADING HALTED: Manual emergency halt triggered.")

    def resume(self) -> None:
        """Resume trading activity after halt."""
        self._halted = False
        logger.info("TRADING RESUMED: Manual resume triggered.")

    def is_halted(self) -> bool:
        """Check if system is currently halted."""
        return self._halted

    # =====================
    # Account Information
    # =====================

    def get_account_info(self) -> Dict[str, Any]:
        return self.broker.get_account_info()

    def get_portfolio_value(self) -> float:
        info = self.get_account_info()
        return info.get("NetLiquidation", 0.0)

    def get_portfolio_state(self) -> PortfolioState:
        """
        Get a snapshot of the current portfolio state.
        Used by Risk Engine and AI Agents.
        """
        return PortfolioState(self.get_positions(), self.get_account_info())

    # =====================
    # Position Management
    # =====================

    def get_positions(self) -> List[Dict[str, Any]]:
        return self.broker.get_positions()

    def get_position(self, symbol: str) -> Optional[Dict[str, Any]]:
        positions = self.get_positions()
        for pos in positions:
            if pos["symbol"] == symbol:
                return pos
        return None

    # =====================
    # Order Execution
    # =====================

    def create_contract(self, symbol: str, sec_type: str = "STK", exchange: str = "SMART") -> Any:
        # Legacy support / Helper if needed, but preferably move to broker adapter
        return None # Deprecated in favor of adapter

    def _validate_risk(self, symbol: str, shares: int, current_price: float, side: str) -> bool:
        """
        Internal pre-trade risk validation.
        Delegates to the centralized RiskManager engine.
        
        Returns:
            True if trade is safe to proceed
        """
        if self._halted:
            logger.error(f"RISK REJECTED: System is HALTED. Cannot {side} {symbol}.")
            return False

        # --- Governance Check: Staged Deployment & Expiry ---
        if not self.active_strategy:
            self.active_strategy = self.gov.get_active_strategy()

        if not self.active_strategy:
            logger.warning(f"RISK REJECTED: No active approved strategy found for {symbol}")
            return False

        # Check Expiry
        if datetime.now() > self.active_strategy.get("ttl_expiry", datetime.max):
            logger.error(f"RISK REJECTED: Strategy {self.active_strategy['strategy_hash'][:8]} has EXPIRED")
            self._halted = True # Fail safe
            return False

        # Deployment Stage Enforcement
        stage = self.active_strategy.get("stage", "SHADOW")
        if stage == "SHADOW":
            logger.info(f"SHADOW MODE: Signal for {side} {shares} {symbol} recorded. Execution suppressed.")
            return False

        if stage == "PAPER" and not self.paper_trading:
            logger.error("RISK REJECTED: PAPER strategy cannot run on LIVE account.")
            return False

        # --- Centralized Risk Engine Call ---
        portfolio_value = self.get_portfolio_value()
        current_positions = self.get_positions()
        account_info = self.get_account_info()
        asset_class = self.registry.get_asset_class(symbol)

        # Calculate Real-Time Daily P&L for Risk Check
        current_pnl = 0.0
        if self.metrics["daily_pnl_initial_value"]:
             current_pnl = portfolio_value - self.metrics["daily_pnl_initial_value"]

        # Liquidity Check (Spread)
        quote = self.get_quote(symbol)
        is_liquid, spread_msg = self.risk_manager.validate_spread(symbol, quote["bid"], quote["ask"])
        if not is_liquid:
             logger.error(f"RISK REJECTED: Liquidity check failed for {symbol}: {spread_msg}")
             return False

        is_valid, reason = self.risk_manager.validate_order(
            symbol=symbol,
            asset_class=asset_class,
            side=side,
            quantity=shares,
            price=current_price,
            portfolio_value=portfolio_value,
            current_positions=current_positions,
            account_info=account_info,
            current_daily_pnl=current_pnl
        )

        if not is_valid:
            logger.error(f"RISK REJECTED: {reason}")
            # If it was a circuit breaker rejection, auto-halt the system
            if "CIRCUIT BREAKER" in reason:
                self.halt()
            return False

        return True

    def check_global_risk(self) -> bool:
        """
        Periodic Global Risk Check (Circuit Breaker).
        Should be called by the scheduler or heartbeat loop.
        
        Returns:
            True if system is healthy, False if HALTED.
        """
        if self._halted:
            return False

        # 1. Check P&L Circuit Breaker
        portfolio_value = self.get_portfolio_value()

        # Initialize daily PnL reference if not set (first run of the day)
        if self.metrics["daily_pnl_initial_value"] is None:
            self.metrics["daily_pnl_initial_value"] = portfolio_value
            logger.info(f"Risk Engine: Initialized Daily P&L Reference at ${portfolio_value:,.2f}")
            return True

        current_pnl = portfolio_value - self.metrics["daily_pnl_initial_value"]

        should_halt, msg = self.risk_manager.check_daily_loss(current_pnl)

        if should_halt:
            logger.critical(f"GLOBAL RISK ALERT: {msg}")
            self.halt()
            # Optional: self.flatten_all_positions() if configured for hard stops
            return False

        return True

    def order_target_percent(
        self,
        symbol: str,
        target_percent: float,
        order_type: str = "ADAPTIVE",
    ) -> Optional[Any]:
        """
        Place order to reach target portfolio percentage.
        """
        if not self.is_connected():
            if not self.connect():
                return None

        # Get portfolio value
        portfolio_value = self.get_portfolio_value()
        target_value = portfolio_value * target_percent

        # Get current position
        current_pos = self.get_position(symbol)
        current_value = current_pos["market_value"] if current_pos else 0.0

        # Calculate difference
        diff_value = target_value - current_value

        # Configurable minimum order threshold (default $100)
        min_order_threshold = getattr(get_settings(), 'min_order_threshold', 100)
        if abs(diff_value) < min_order_threshold:
            logger.info(f"Skipping {symbol}: difference too small (${diff_value:.2f})")
            return None

        # Get current price
        quote = self.get_quote(symbol)
        current_price = quote.get("last", 0.0) or quote.get("ask", 0.0) # Fallback

        if current_price <= 0:
            logger.warning(f"Could not get price for {symbol}")
            return None

        # Calculate shares
        shares = int(diff_value / current_price)

        if shares == 0:
            return None

        # Determine order action
        action = "BUY" if shares > 0 else "SELL"
        shares = abs(shares)

        # --- Pre-Trade Risk Gate ---
        import time
        start_time = time.time()

        if not self._validate_risk(symbol, shares, current_price, action):
            return None

        # Submit via Broker Adapter
        trade = self.broker.submit_order(symbol, shares, action, order_type, current_price)

        # Telemetry
        latency = (time.time() - start_time) * 1000
        self.metrics["order_latencies"].append(latency)

        return trade

    def liquidate_position(self, symbol: str) -> Optional[Any]:
        """
        Liquidate entire position in a symbol.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Order trade object
        """
        return self.order_target_percent(symbol, 0.0)

    def submit_order(self, order: Dict[str, Any]) -> Optional[Any]:
        """
        Submit a pre-built order dictionary.
        
        Args:
            order: Order specification dict
            
        Returns:
            Order trade object
        """
        symbol = order.get("symbol")
        quantity = order.get("quantity", 0)
        side = order.get("side", "BUY")
        order_type = order.get("order_type", "MKT")

        if not symbol or quantity == 0:
            return None

        if not self.is_connected():
            if not self.connect():
                return None

        if self._ib is None:
            return None

        from ib_insync import LimitOrder, MarketOrder

        contract = self.create_contract(symbol)

        if order_type.upper() == "MKT":
            ib_order = MarketOrder(side, abs(quantity))
        else:
            price = order.get("limit_price", 0)
            ib_order = LimitOrder(side, abs(quantity), price)

        trade = self._ib.placeOrder(contract, ib_order)

        logger.info(f"Submitted order: {side} {quantity} {symbol}")

        return trade

    # =====================
    # Order Management
    # =====================

    def get_open_orders(self) -> List[Dict[str, Any]]:
        if not self.is_connected():
            return []
        return self.broker.get_open_orders()

    def get_recent_orders(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.is_connected():
            return []
        return self.broker.get_recent_orders(limit=limit)

    def cancel_all_orders(self) -> int:
        if not self.is_connected():
            return 0
        return self.broker.cancel_all_orders()

    # =====================
    # Market Data
    # =====================

    def get_quote(self, symbol: str) -> Dict[str, float]:
        if not self.is_connected():
            return {"bid": 0.0, "ask": 0.0, "last": 0.0, "volume": 0}
        return self.broker.get_quote(symbol)

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get system health status for the control plane.
        """
        positions = self.get_positions()
        account = self.get_account_info()
        total_equity = account.get("NetLiquidation", 0.0)

        # Use new comprehensive risk logic
        risk_summary = self.risk_manager.get_portfolio_risk(positions, total_equity)

        # P&L Calculation
        daily_pnl = account.get("DailyPnL")
        if daily_pnl is None:
            # Fallback to local session tracking
            if self.metrics["daily_pnl_initial_value"]:
                daily_pnl = total_equity - self.metrics["daily_pnl_initial_value"]
            else:
                daily_pnl = 0.0

        status = {
            "ib_connected": self.is_connected(),
            "engine_halted": self._halted,
            "last_heartbeat": datetime.now().isoformat(),
            "latency_p50_ms": 0.0,
            "latency_p99_ms": 0.0,
            "truth_layer_active": len(self.aggregators) > 0,
            "active_symbols": list(self.aggregators.keys()),
            "portfolio_var_95_usd": risk_summary["var_95_usd"],
            "portfolio_var_95_percent": risk_summary["var_95_percent"],
            "portfolio_es_95_usd": risk_summary["expected_shortfall_usd"],
            "stress_tests": risk_summary["stress_tests"],
            "daily_pnl_usd": daily_pnl,
            "net_liquidation": total_equity
        }

        if self.metrics["order_latencies"]:
            import numpy as np
            status["latency_p50_ms"] = float(np.percentile(self.metrics["order_latencies"], 50))
            status["latency_p99_ms"] = float(np.percentile(self.metrics["order_latencies"], 99))

        return status

    def get_live_candles(self) -> Dict[str, Dict[str, Any]]:
        """Returns the current forming candle state for all active symbols."""
        results = {}
        for symbol, agg in self.aggregators.items():
            if agg.current_candle:
                c = agg.current_candle
                results[symbol] = {
                    "start_ts": c.start_ts,
                    "open": c.open,
                    "high": c.high,
                    "low": c.low,
                    "close": c.close,
                    "volume": c.volume
                }
        return results

    def flatten_all_positions(self) -> int:
        """
        Emergency: Liquidate all positions immediately.
        """
        logger.warning("EMERGENCY: Flattening all positions!")
        positions = self.get_positions()
        count = 0
        for pos in positions:
            self.liquidate_position(pos["symbol"])
            count += 1
        return count
    def run_blocking(self) -> None:
        """
        Run the IB event loop blocking execution.
        Use this for the main entry point script.
        """
        if self.is_connected():
            logger.info("Starting IB Event Loop...")
            self._ib.run()
