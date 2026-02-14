import json
import sys
from pathlib import Path

import loguru

# Ensure backend is in path
sys.path.append(str(Path(__file__).resolve().parents[3]))

from backend.omega.trading_app import TradingApp

# Try importing ib_insync
try:
    from ib_insync import Forex, MarketOrder
except ImportError:
    loguru.logger.error("ib_insync not installed.")
    sys.exit(1)

CONFIG_PATH = Path(__file__).parent / "configurations" / "live_arb_config.json"

class ArbitrageStrategy:
    def __init__(self, config_path=CONFIG_PATH):
        self.config = self._load_config(config_path)
        self.app = TradingApp(paper_trading=True) # Default to paper for safety
        self.tickers = {}
        self.prices = {}

    def _load_config(self, path):
        with open(path, "r") as f:
            return json.load(f)

    def run(self):
        """
        Start the strategy.
        """
        loguru.logger.info("Starting Arbitrage Strategy...")

        # 1. Connect
        if not self.app.connect():
            loguru.logger.error("Failed to connect to Broker.")
            return

        # Ensure we are using IBKR
        if self.app.broker_type != "IBKR":
            loguru.logger.error("Arbitrage Strategy requires IBKR broker.")
            return

        # Access underlying IB instance
        self.ib = self.app.broker._ib

        # 2. Define Contracts
        pairs_config = self.config["pairs"][0] # Just take the first set for now
        base = pairs_config["base"]
        leg1 = pairs_config["leg1"]
        leg2 = pairs_config["leg2"]

        # Pairs: Base/Leg1, Leg1/Leg2, Leg2/Base?
        # Formula: (1/EURUSD_Ask) * (EURGBP_Bid) * (GBPUSD_Bid)
        # Implies: EURUSD, EURGBP, GBPUSD
        # leg1=EUR, leg2=GBP, base=USD

        # Pair 1: EURUSD (leg1 + base)
        c1 = Forex(f"{leg1}{base}")
        # Pair 2: EURGBP (leg1 + leg2)
        c2 = Forex(f"{leg1}{leg2}")
        # Pair 3: GBPUSD (leg2 + base)
        c3 = Forex(f"{leg2}{base}")

        self.contracts = {
            "p1": c1,
            "p2": c2,
            "p3": c3
        }

        # 3. Qualify Contracts
        loguru.logger.info("Qualifying contracts...")
        self.ib.qualifyContracts(*self.contracts.values())

        # 4. Subscribe
        loguru.logger.info("Subscribing to market data...")
        for c in self.contracts.values():
            self.ib.reqMktData(c)

        # 5. Register Handler
        self.ib.pendingTickersEvent += self.on_tick

        # 6. Run Loop
        loguru.logger.info("Entering Event Loop...")
        self.ib.run()

    def on_tick(self, tickers):
        """
        Event handler for market data updates.
        """
        # Update prices
        for t in tickers:
            symbol = t.contract.localSymbol # e.g. EUR.USD
            # Map back to our keys?
            # Or just store by contract object
            self.prices[t.contract.symbol + t.contract.currency] = t

        # Calculate Arb
        # Formula: (1/EURUSD_Ask) * (EURGBP_Bid) * (GBPUSD_Bid)

        p1 = self.contracts["p1"] # EURUSD
        p2 = self.contracts["p2"] # EURGBP
        p3 = self.contracts["p3"] # GBPUSD

        t1 = self.prices.get(p1.symbol + p1.currency)
        t2 = self.prices.get(p2.symbol + p2.currency)
        t3 = self.prices.get(p3.symbol + p3.currency)

        if not (t1 and t2 and t3):
            return

        # Check for valid quotes
        if not (t1.ask and t2.bid and t3.bid):
            return

        # Calculate Path 1
        # Start USD -> Buy EUR (1/Ask EURUSD) -> Sell EUR for GBP (Bid EURGBP) -> Sell GBP for USD (Bid GBPUSD)

        rate1 = 1.0 / t1.ask
        rate2 = t2.bid
        rate3 = t3.bid

        result = rate1 * rate2 * rate3

        # Threshold
        min_profit_bps = self.config["risk_parameters"]["min_profit_bps"]
        threshold = 1.0 + (min_profit_bps / 10000.0)

        if result > threshold:
            loguru.logger.success(f"ARB OPPORTUNITY: {result:.6f} > {threshold}")
            self.execute_arb()

    def execute_arb(self):
        # Prevent re-entry?
        # Submit 3 market orders
        # 1. Buy EURUSD (Buy EUR)
        # 2. Sell EURGBP (Sell EUR)
        # 3. Sell GBPUSD (Sell GBP)

        # Size?
        # max_position_size (USD)
        usd_size = self.config["risk_parameters"]["max_position_size"]

        # Order 1: Buy EURUSD. Quantity is EUR amount.
        # USD Size / EURUSD Rate
        p1_rate = 1.0 / self.prices[self.contracts["p1"].symbol + self.contracts["p1"].currency].ask
        qty1 = int(usd_size * p1_rate)

        # Order 2: Sell EURGBP. Quantity is EUR amount.
        # Same qty of EUR? Yes.
        qty2 = qty1

        # Order 3: Sell GBPUSD. Quantity is GBP amount.
        # EUR Amount * EURGBP Bid
        p2_rate = self.prices[self.contracts["p2"].symbol + self.contracts["p2"].currency].bid
        qty3 = int(qty2 * p2_rate)

        orders = [
            MarketOrder("BUY", qty1),
            MarketOrder("SELL", qty2),
            MarketOrder("SELL", qty3)
        ]
        contracts = [
            self.contracts["p1"],
            self.contracts["p2"],
            self.contracts["p3"]
        ]

        loguru.logger.info(f"Executing Arb: {qty1} EUR -> {qty2} EUR -> {qty3} GBP")

        for c, o in zip(contracts, orders):
            self.ib.placeOrder(c, o)

if __name__ == "__main__":
    strategy = ArbitrageStrategy()
    strategy.run()
