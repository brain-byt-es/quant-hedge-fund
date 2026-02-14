"""
QS Research - Brokerage Models

Inspired by QuantConnect Lean. Provides realistic fee and slippage models
for different brokerages.
"""


class BrokerageModel:
    def __init__(self, name: str):
        self.name = name

    def calculate_fees(self, turnover_value: float, turnover_shares: int, side: str) -> float:
        """Calculate transaction fees."""
        return 0.0

    def get_slippage(self, symbol: str, volume: float) -> float:
        """Estimate slippage as a percentage of the price."""
        return 0.0005 # Default 5bps

class AlpacaModel(BrokerageModel):
    def __init__(self):
        super().__init__("ALPACA")
        # 2024 Regulatory Rates
        self.sec_fee_rate = 0.0000229  # per dollar sold
        self.finra_taf_rate = 0.000145 # per share sold (max $7.27)

    def calculate_fees(self, turnover_value: float, turnover_shares: int, side: str) -> float:
        # Alpaca is commission-free, but passes on regulatory fees on SELL orders
        if side.lower() == "sell":
            sec_fee = turnover_value * self.sec_fee_rate
            finra_fee = min(7.27, turnover_shares * self.finra_taf_rate)
            return sec_fee + finra_fee
        return 0.0

    def get_slippage(self, symbol: str, volume: float) -> float:
        # Lean-style: Higher volume = lower slippage relative to price
        # Simplified: 2bps for highly liquid, up to 10bps for lower volume
        return 0.0002 if volume > 1000000 else 0.0010

class IBKRModel(BrokerageModel):
    def __init__(self):
        super().__init__("IBKR")
        self.commission_per_share = 0.005 # US Fixed Pricing
        self.min_commission = 1.00
        self.max_commission_pct = 0.01

    def calculate_fees(self, turnover_value: float, turnover_shares: int, side: str) -> float:
        # IBKR Fixed Pricing (US Equities)
        raw_comm = turnover_shares * self.commission_per_share
        actual_comm = max(self.min_commission, raw_comm)
        actual_comm = min(actual_comm, turnover_value * self.max_commission_pct)

        # Add tiny regulatory fees on sell
        if side.lower() == "sell":
            actual_comm += (turnover_value * 0.0000229)

        return actual_comm

    def get_slippage(self, symbol: str, volume: float) -> float:
        # IBKR has better execution (SmartRouting), usually lower slippage than Alpaca
        return 0.0001 if volume > 1000000 else 0.0005

def get_brokerage_model(name: str) -> BrokerageModel:
    name = name.upper()
    if name == "IBKR" or name == "INTERACTIVE_BROKERS":
        return IBKRModel()
    return AlpacaModel() # Default to Alpaca
