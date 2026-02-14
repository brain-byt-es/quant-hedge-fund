import pandas as pd


def compute_factor(prices: pd.DataFrame, **kwargs) -> pd.Series:
    # Calculate daily returns
    daily_returns = prices['close'].pct_change()

    # Calculate 20-day momentum
    momentum = prices['close'].pct_change(periods=20)

    # Calculate 20-day rolling volatility
    rolling_volatility = daily_returns.rolling(window=20).std()

    # Determine the median volatility of the universe
    median_volatility = rolling_volatility.median()

    # Apply volatility filter: Only consider momentum if volatility is below median
    filtered_momentum = momentum.where(rolling_volatility < median_volatility, other=0)

    # Return the filtered momentum as the factor
    return filtered_momentum
