"""
QS Connect - Candle Engine
Deterministic aggregation of raw trade ticks into candles.
Refactored for Burst Mode performance.
"""

import asyncio
import math
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

import requests
from loguru import logger

# Constants
MAX_CLOCK_SKEW_SEC = 5.0

@dataclass(frozen=True)
class Tick:
    symbol: str
    price: float
    size: float
    exchange_ts: float  # Epoch seconds from exchange
    recv_ts: float      # Local receive time
    source: str = "UNKNOWN"
    asset_class: str = "UNKNOWN"

@dataclass
class Candle:
    symbol: str
    start_ts: float
    end_ts: float
    open: float
    high: float
    low: float
    close: float
    volume: float
    is_final: bool = False
    source: str = "UNKNOWN"
    asset_class: str = "UNKNOWN"

class BarCloseEventBus:
    """Isolated event bus for bar close triggers."""
    def __init__(self):
        self._subscribers: List[Callable[[Candle], None]] = []
        
    def subscribe(self, callback: Callable[[Candle], None]):
        self._subscribers.append(callback)
        
    def emit(self, candle: Candle):
        for sub in self._subscribers:
            try:
                sub(candle)
            except Exception as e:
                logger.error(f"EventBus Subscriber Error: {e}")

class SessionManager:
    """Manages exchange hours alignment."""
    def __init__(self, rth_only: bool = True):
        self.rth_only = rth_only
        
    def is_in_session(self, ts: float, symbol: str) -> bool:
        dt = datetime.fromtimestamp(ts)
        if dt.weekday() >= 5: return False
        minutes_since_midnight = dt.hour * 60 + dt.minute
        return (9*60 + 30) <= minutes_since_midnight <= (16*60)

class BurstBuffer:
    """
    Institutional Burst Mode Buffer.
    Handles dual-trigger flushes (Time & Volume) to optimize DuckDB throughput.
    """
    def __init__(self, flush_interval_ms: int = 500, max_size: int = 100):
        self._buffer: Dict[str, Candle] = {} 
        self._lock = asyncio.Lock()
        self._flush_interval = flush_interval_ms / 1000.0
        self._max_size = max_size
        self._last_flush = time.time()
        self._flush_url = "http://localhost:8001/upsert/candles/batch"
        self._is_running = False

    async def add(self, candle: Candle):
        """Add or update candle in the Hot Buffer."""
        if not self._is_running:
            self._is_running = True
            asyncio.create_task(self.run_loop())

        key = f"{candle.symbol}_{candle.start_ts}"
        async with self._lock:
            self._buffer[key] = candle
            
            # Volume-based Trigger
            if len(self._buffer) >= self._max_size:
                await self._flush_no_lock()

    async def _flush_no_lock(self):
        """Internal flush without acquiring lock (caller must hold it)."""
        if not self._buffer: return
        
        batch = []
        for c in self._buffer.values():
            d = asdict(c)
            d["timestamp"] = datetime.fromtimestamp(c.start_ts).isoformat()
            batch.append(d)
        
        try:
            resp = requests.post(self._flush_url, json=batch, timeout=2)
            if resp.status_code == 200:
                self._buffer.clear()
                self._last_flush = time.time()
            else:
                logger.error(f"BurstBuffer Flush Failed: {resp.text}")
        except Exception as e:
            logger.error(f"BurstBuffer Network Error: {e}")

    async def flush(self):
        """Thread-safe flush."""
        async with self._lock:
            await self._flush_no_lock()

    async def run_loop(self):
        """Time-based Trigger loop."""
        while True:
            await asyncio.sleep(self._flush_interval)
            async with self._lock:
                if self._buffer and (time.time() - self._last_flush >= self._flush_interval):
                    await self._flush_no_lock()

# Process-global buffer
GLOBAL_BURST_BUFFER = BurstBuffer()

class CandleAggregator:
    """
    Deterministic tick-to-bar aggregator with Burst Mode support.
    """
    def __init__(
        self, 
        symbol: str, 
        interval_sec: int = 60, 
        session_mgr: Optional[SessionManager] = None,
        event_bus: Optional[BarCloseEventBus] = None,
        source: str = "UNKNOWN",
        asset_class: str = "UNKNOWN"
    ):
        self.symbol = symbol
        self.interval_sec = interval_sec
        self.session_mgr = session_mgr or SessionManager()
        self.event_bus = event_bus or BarCloseEventBus()
        self.source = source
        self.asset_class = asset_class
        
        self.current_candle: Optional[Candle] = None
        self.last_finalized_ts: float = 0
        
    def process_tick(self, tick_raw: Tick):
        """Processes a single trade tick. Submits to BurstBuffer."""
        if tick_raw.size <= 0: return
            
        exchange_ts = round(tick_raw.exchange_ts, 3)
        if not self.session_mgr.is_in_session(exchange_ts, self.symbol): return
            
        if self.last_finalized_ts > 0 and exchange_ts < self.last_finalized_ts:
            return
            
        bucket_start = math.floor(exchange_ts / self.interval_sec) * self.interval_sec
        
        if self.current_candle:
            if bucket_start > self.current_candle.start_ts:
                self._finalize_candle()

        if not self.current_candle:
            self.current_candle = Candle(
                symbol=self.symbol,
                start_ts=bucket_start,
                end_ts=bucket_start + self.interval_sec,
                open=tick_raw.price,
                high=tick_raw.price,
                low=tick_raw.price,
                close=tick_raw.price,
                volume=tick_raw.size,
                source=self.source,
                asset_class=self.asset_class
            )
        else:
            self.current_candle.high = max(self.current_candle.high, tick_raw.price)
            self.current_candle.low = min(self.current_candle.low, tick_raw.price)
            self.current_candle.close = tick_raw.price
            self.current_candle.volume += tick_raw.size
            
        # Push to Hot Buffer (Non-blocking task)
        asyncio.create_task(GLOBAL_BURST_BUFFER.add(self.current_candle))

    def _finalize_candle(self):
        """Finalizes the current open bar."""
        if not self.current_candle: return
            
        self.current_candle.is_final = True
        final_bar = self.current_candle
        self.last_finalized_ts = final_bar.end_ts
        self.current_candle = None
        
        # Immediate buffer submission for bar close
        asyncio.create_task(GLOBAL_BURST_BUFFER.add(final_bar))
        self.event_bus.emit(final_bar)

    def force_finalize(self):
        self._finalize_candle()
