import numpy as np
from zipline.pipeline.data import USEquityPricing
from zipline.pipeline.factors import CustomFactor


class Momentum(CustomFactor):
    """
    Momentum factor: Returns over window_length minus returns over gap_window.
    Default: 12m - 1m (252 - 21 days).
    """
    inputs = [USEquityPricing.close]
    params = {'gap_window': 21}

    def compute(self, today, assets, out, close, gap_window):
        # close is (window_length, num_assets)
        # We want return from t-window_length to t-gap_window
        # calculated as: (Price_t-gap / Price_t-window) - 1

        # Or as requested: Returns(window) - Returns(gap)
        # Returns(window) = (P_t / P_t-window) - 1
        # Returns(gap) = (P_t / P_t-gap) - 1
        # Diff = (P_t / P_t-window) - (P_t / P_t-gap)

        # Let's interpret "percentage change over window_length ... minus the gap_window"
        # as standard 12m-1m momentum.
        # which is usually (Price[-21] / Price[-252]) - 1

        # Indexing:
        # close[-1] is the most recent close (t-1 if run before open)
        # close[-gap_window] is close at t-gap_window
        # close[0] is close at t-window_length

        start_prices = close[0]
        end_prices = close[-gap_window]

        # Handle zeros to avoid division by zero
        start_prices[start_prices == 0] = np.nan

        out[:] = (end_prices / start_prices) - 1.0

def make_momentum_factor(window_length=252, gap_window=21):
    return Momentum(window_length=window_length, gap_window=gap_window)
