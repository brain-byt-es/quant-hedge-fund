"""
Omega - Trading Application

Main trading application for executing trades with Async execution and Lifecycle Tracking.
"""

import asyncio
import uuid
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
        self.total_equity = float(account.get("NetLiquidation", 0.0) or 0.0)


class TradingApp:
    """
    Main trading application for Omega.
    Refactored for 100% Async Execution and Order Lifecycle Persistence.
    """

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        client_id: Optional[int] = None,
        paper_trading: bool = True,
    ):
        settings = get_settings()

        self.host = host or settings.ib_host
        self.port = port or settings.ib_port
        self.client_id = client_id or settings.ib_client_id
        self.paper_trading = paper_trading

        self._halted = False  

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
        else:
            from omega.broker.ibkr import IBBroker
            self.broker = IBBroker(self.host, self.port, self.client_id)

        # Unified Architecture: TradingApp is a Proxy to Data Service
        from qsconnect.database.remote_writer import RemoteWriter
        self._writer = RemoteWriter()
        
        # In Unified mode, we NO LONGER use a local DuckDBManager to avoid Read-Write lock conflicts.
        # GovernanceManager and all other subsystems must use self._writer (Proxy).
        self.gov = GovernanceManager() # Will use its own internal RemoteWriter
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

        logger.info(f"TradingApp initialized (Async Mode): {self.broker_type}")

    async def set_broker(self, broker_type: str) -> bool:
        """Dynamically switch the active broker (Async)."""
        broker_type = broker_type.upper()
        if broker_type == self.broker_type and self.is_connected():
            return True

        logger.info(f"Switching broker to {broker_type}...")
        settings = get_settings()

        try:
            if broker_type == "ALPACA":
                from omega.broker.alpaca import AlpacaBroker
                self.broker = AlpacaBroker(settings.alpaca_api_key, settings.alpaca_secret_key, settings.alpaca_paper)
            elif broker_type == "IBKR":
                from omega.broker.ibkr import IBBroker
                self.broker = IBBroker(self.host, self.port, self.client_id)
            else:
                return False

            self.broker_type = broker_type
            return await self.connect()
        except Exception as e:
            logger.error(f"Broker switch failed: {e}")
            return False

    # =====================
    # Connection Management
    # =====================

    async def connect(self) -> bool:
        """Connect to the active broker (Async)."""
        success = await self.broker.connect()
        if success:
            # Start background risk and attribution heartbeat
            asyncio.create_task(self._async_performance_heartbeat())
        return success

    async def _async_performance_heartbeat(self):
        """Async background task for risk monitoring and sub-portfolio snapshotting."""
        logger.info("Omega: Performance Heartbeat started.")
        while self.is_connected():
            try:
                # 1. Check Global Risk (Dynamic Stops)
                await self.check_global_risk()
                
                # 2. Sub-Portfolio Snapshotting
                await self._snapshot_sub_portfolios()

            except Exception as e:
                logger.error(f"Performance Heartbeat Error: {e}")
            
            await asyncio.sleep(60) # 60s attribution resolution

    async def _snapshot_sub_portfolios(self):
        """Calculates and persists snapshots for each strategy isolated by its hash."""
        try:
            # Fetch all unique strategy hashes from audit log that have capital via Proxy
            df_strategies = self._writer.query("SELECT strategy_hash, capital_allocation FROM strategy_audit_log WHERE capital_allocation > 0")
            if df_strategies.is_empty(): return
            
            strategies = df_strategies.to_dicts()

            for strat in strategies:
                s_hash = strat['strategy_hash']
                allocation = strat['capital_allocation'] or 0.0
                
                # Calculate realized P&L for this hash from trades table via Proxy
                realized_res = self._writer.query(f"SELECT SUM(fill_price * quantity * CASE WHEN side='SELL' THEN 1 ELSE -1 END) as realized FROM trades WHERE strategy_hash = '{s_hash}' AND fill_price IS NOT NULL")
                realized = realized_res["realized"][0] if not realized_res.is_empty() and realized_res["realized"][0] is not None else 0.0
                
                # Note: Real attribution would also calculate unrealized P&L by mapping current positions to strategy hashes.
                unrealized = 0.0 
                current_equity = allocation + realized + unrealized
                
                # Persist Snapshot via Data Service Proxy
                sql = """
                    INSERT INTO sub_portfolio_snapshots 
                    (strategy_hash, equity, realized_pnl, unrealized_pnl, daily_pnl)
                    VALUES (?, ?, ?, ?, ?)
                """
                params = [s_hash, float(current_equity), float(realized), float(unrealized), 0.0]
                self._writer.execute(sql, params)
                
        except Exception as e:
            logger.error(f"Sub-Portfolio Snapshot Error: {e}")

    def is_connected(self) -> bool:
        return self.broker.is_connected()

    def halt(self) -> None:
        self._halted = True
        logger.warning("TRADING HALTED: Manual emergency halt triggered.")

    def resume(self) -> None:
        self._halted = False
        logger.info("TRADING RESUMED: Manual resume triggered.")

    # =====================
    # Account Information
    # =====================

    async def get_account_info(self) -> Dict[str, Any]:
        return await self.broker.get_account_info()

    async def get_portfolio_value(self) -> float:
        info = await self.get_account_info()
        return info.get("NetLiquidation", 0.0)

    async def get_portfolio_state(self) -> PortfolioState:
        # Run in parallel for speed
        positions, account = await asyncio.gather(
            self.broker.get_positions(),
            self.broker.get_account_info()
        )
        return PortfolioState(positions, account)

    # =====================
    # Order Execution
    # =====================

    async def _validate_risk(self, symbol: str, shares: int, current_price: float, side: str) -> bool:
        """Async pre-trade risk validation."""
        if self._halted:
            logger.error(f"RISK REJECTED: System is HALTED. Cannot {side} {symbol}.")
            return False

        if not self.active_strategy:
            # Note: GovernanceManager might still use local DB, but we proxy its main lookup
            self.active_strategy = self.gov.get_active_strategy()

        if not self.active_strategy:
            logger.warning(f"RISK REJECTED: No active approved strategy found for {symbol}")
            return False

        # Parallel data fetch for risk engine
        portfolio_value, current_positions, account_info, quote = await asyncio.gather(
            self.get_portfolio_value(),
            self.broker.get_positions(),
            self.broker.get_account_info(),
            self.broker.get_quote(symbol)
        )

        asset_class = self.registry.get_asset_class(symbol)
        current_pnl = 0.0
        if self.metrics["daily_pnl_initial_value"]:
             current_pnl = portfolio_value - self.metrics["daily_pnl_initial_value"]

        # Liquidity Check
        is_liquid, spread_msg = self.risk_manager.validate_spread(symbol, quote["bid"], quote["ask"])
        if not is_liquid:
             logger.error(f"RISK REJECTED: Liquidity check failed for {symbol}: {spread_msg}")
             return False

        is_valid, reason = self.risk_manager.validate_order(
            symbol=symbol, asset_class=asset_class, side=side, quantity=shares,
            price=current_price, portfolio_value=portfolio_value,
            current_positions=current_positions, account_info=account_info,
            current_daily_pnl=current_pnl
        )

        if not is_valid:
            logger.error(f"RISK REJECTED: {reason}")
            if "CIRCUIT BREAKER" in reason: self.halt()
            return False

        return True

    async def order_target_percent(
        self,
        symbol: str,
        target_percent: float,
        order_type: str = "ADAPTIVE",
    ) -> Optional[Any]:
        """Place order to reach target portfolio percentage (Async + Persistent)."""
        if not self.is_connected():
            if not await self.connect(): return None

        # 1. State Snapshot
        portfolio_value = await self.get_portfolio_value()
        target_value = portfolio_value * target_percent

        # Get current position
        positions = await self.broker.get_positions()
        current_pos = next((p for p in positions if p["symbol"] == symbol), None)
        current_value = current_pos["market_value"] if current_pos else 0.0

        diff_value = target_value - current_value
        min_order_threshold = getattr(get_settings(), 'min_order_threshold', 100)
        if abs(diff_value) < min_order_threshold:
            return None

        quote = await self.broker.get_quote(symbol)
        current_price = quote.get("last", 0.0) or quote.get("ask", 0.0)

        if current_price <= 0:
            logger.warning(f"Could not get price for {symbol}")
            return None

        shares = int(diff_value / current_price)
        if shares == 0: return None

        action = "BUY" if shares > 0 else "SELL"
        shares = abs(shares)

        # 2. Risk Gate
        if not await self._validate_risk(symbol, shares, current_price, action):
            return None

        # 3. Order Lifecycle Persistence (PENDING)
        order_id = str(uuid.uuid4())
        strategy_hash = self.active_strategy.get("strategy_hash", "manual")
        
        # Log to Data Service before network call
        self._writer.execute("""
            INSERT INTO trades (trade_id, strategy_hash, symbol, side, quantity, order_type, execution_time)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, [order_id, strategy_hash, symbol, action, float(shares), "PENDING_SUBMIT"])

        # 4. Async Execution
        start_time = asyncio.get_event_loop().time()
        try:
            trade = await self.broker.submit_order(symbol, shares, action, order_type, current_price)
            
            # Update state to SUBMITTED
            self._writer.execute("UPDATE trades SET order_type = ? WHERE trade_id = ?", ["SUBMITTED", order_id])
            
            latency = (asyncio.get_event_loop().time() - start_time) * 1000
            self.metrics["order_latencies"].append(latency)
            return trade
        except Exception as e:
            logger.error(f"Execution Error for {symbol}: {e}")
            self._writer.execute("UPDATE trades SET order_type = ? WHERE trade_id = ?", [f"FAILED: {str(e)[:50]}", order_id])
            return None

    # =====================
    # Order Management
    # =====================

    async def get_open_orders(self) -> List[Dict[str, Any]]:
        if not self.is_connected(): return []
        return await self.broker.get_open_orders()

    async def get_recent_orders(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.is_connected(): return []
        return await self.broker.get_recent_orders(limit=limit)

    async def cancel_all_orders(self) -> int:
        if not self.is_connected(): return 0
        return await self.broker.cancel_all_orders()

    # =====================
    # Market Data
    # =====================

    async def get_quote(self, symbol: str) -> Dict[str, float]:
        if not self.is_connected(): return {"bid": 0.0, "ask": 0.0, "last": 0.0, "volume": 0}
        return await self.broker.get_quote(symbol)

    async def get_health_status(self) -> Dict[str, Any]:
        """Unified async health check."""
        positions, account = await asyncio.gather(
            self.broker.get_positions(),
            self.broker.get_account_info()
        )
        total_equity = account.get("NetLiquidation", 0.0)
        risk_summary = self.risk_manager.get_portfolio_risk(positions, total_equity)

        daily_pnl = account.get("DailyPnL", 0.0)
        status = {
            "ib_connected": self.is_connected(),
            "engine_halted": self._halted,
            "last_heartbeat": datetime.now().isoformat(),
            "truth_layer_active": len(self.aggregators) > 0,
            "portfolio_var_95_usd": risk_summary["var_95_usd"],
            "daily_pnl_usd": daily_pnl,
            "net_liquidation": total_equity
        }
        return status

    async def flatten_all_positions(self) -> int:
        logger.warning("EMERGENCY: Flattening all positions!")
        positions = await self.broker.get_positions()
        # Fire all liquidations in parallel
        tasks = [self.order_target_percent(pos["symbol"], 0.0) for pos in positions]
        await asyncio.gather(*tasks)
        return len(positions)

    async def check_global_risk(self) -> bool:
        """
        Periodic Global Risk Check (Risk V2).
        Calculates dynamic stop limits based on realized volatility and regime.
        """
        if self._halted: return False

        try:
            # 1. Fetch State
            positions = await self.broker.get_positions()
            account = await self.broker.get_account_info()
            total_equity = account.get("NetLiquidation", 0.0)

            if total_equity == 0: return True

            # 2. Daily P&L
            if self.metrics["daily_pnl_initial_value"] is None:
                self.metrics["daily_pnl_initial_value"] = total_equity
                logger.info(f"Risk V2: Reference initialized at ${total_equity:,.2f}")
                return True

            current_pnl = total_equity - self.metrics["daily_pnl_initial_value"]

            # 3. Dynamic Volatility & Regime Multiplier
            realized_vol = self.risk_manager.calculate_portfolio_volatility(positions, lookback_days=20)
            
            regime = "Neutral"
            if self.active_strategy and "regime_snapshot" in self.active_strategy:
                regime = self.active_strategy["regime_snapshot"].get("regime_label", "Neutral")

            # 4. Dynamic Halt Check
            should_halt, msg = self.risk_manager.check_daily_loss(
                current_pnl=current_pnl,
                portfolio_value=total_equity,
                realized_vol=realized_vol,
                regime=regime
            )

            if should_halt:
                logger.critical(f"RISK V2 HALT: {msg}")
                self.halt()
                return False

            return True
        except Exception as e:
            logger.error(f"Global Risk Check Failed: {e}")
            return True
