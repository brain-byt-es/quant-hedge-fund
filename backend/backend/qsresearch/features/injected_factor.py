import pandas as pd


def compute_factor(prices: pd.DataFrame, **kwargs) -> pd.Series:
    # Calculate the rolling 10-day mean of the closing prices
    rolling_mean = prices['close'].rolling(window=10).mean()
    
    # Calculate the rolling 10-day standard deviation of the closing prices
    rolling_std = prices['close'].rolling(window=10).std()
    
    # Calculate the momentum factor as the difference between the current closing price and the 10-day rolling mean,
    # normalized by the rolling standard deviation
    momentum_factor = (prices['close'] - rolling_mean) / rolling_std
    
    return momentum_factor