import pandas as pd
from loguru import logger
from api.routers.data import get_qs_client

def use_factor_as_signal(df: pd.DataFrame, **params) -> pd.DataFrame:
    """
    Simple fallback strategy.
    """
    logger.info("Using default factor strategy")
    return pd.DataFrame()

def dynamic_custom_factor(df: pd.DataFrame, **params) -> pd.DataFrame:
    """
    Executes the AI-injected factor code on the fly.
    """
    try:
        import importlib.util
        import sys
        
        path = "backend/qsresearch/features/injected_factor.py"
        spec = importlib.util.spec_from_file_location("injected_factor", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        logger.info("Executing dynamic AI-injected factor...")
        
        # Group by symbol and apply the custom compute_factor
        results = []
        for symbol, group in df.groupby('symbol'):
            # Sort by date to ensure time-series correctness
            group = group.sort_values('date')
            factor_values = module.compute_factor(group, **params)
            
            # Combine back with dates
            res = pd.DataFrame({'date': group['date'], 'symbol': symbol, 'factor_val': factor_values})
            results.append(res)
            
        full_factors = pd.concat(results)
        
        # Pivot to Matrix (Date x Symbol)
        factor_matrix = full_factors.pivot(index='date', columns='symbol', values='factor_val')
        
        # Ranking: Pick Top N symbols every day
        top_n = params.get("top_n", 20)
        
        # Create signals: 1 for Top N, 0 otherwise
        ranks = factor_matrix.rank(axis=1, ascending=False)
        signals = (ranks <= top_n).astype(int)
        
        return signals

    except Exception as e:
        logger.error(f"Dynamic factor execution failed: {e}")
        return pd.DataFrame()

def multi_factor_rebalance(df: pd.DataFrame, **params) -> pd.DataFrame:
    """
    Multi-Factor Strategy using pre-calculated ranks from DuckDB.
    
    Params:
    - f_score_min (int): Minimum Piotroski F-Score (0-9)
    - momentum_min (float): Minimum Momentum Percentile (0-100)
    - top_n (int): Max number of stocks to hold
    """
    try:
        client = get_qs_client()
        f_min = params.get("f_score_min", 7)
        mom_min = params.get("momentum_min", 80)
        top_n = params.get("top_n", 50)
        
        logger.info(f"Executing Multi-Factor Strategy: F-Score >= {f_min}, Momentum >= {mom_min}")
        
        # Fetch latest ranks
        sql = f"""
            SELECT symbol, momentum_score, f_score 
            FROM factor_ranks_snapshot 
            WHERE f_score >= {f_min} 
              AND momentum_score >= {mom_min}
            ORDER BY momentum_score DESC
            LIMIT {top_n}
        """
        
        candidates = client.query(sql).to_df()
        
        if candidates.empty:
            logger.warning("No stocks matched the criteria!")
            return pd.DataFrame()
            
        logger.info(f"Selected {len(candidates)} stocks for portfolio.")
        
        # Create a signal DataFrame compatible with the simulator
        # Index: Date, Columns: Symbols, Value: 1 (Long)
        # Since this is a snapshot strategy, we assume we hold these stocks 'now' and backtest their recent history?
        # OR we simulate a static hold of these current winners over the backtest period (Lookahead bias!)
        
        # CORRECT APPROACH for a proper backtest:
        # We need historical factor ranks. But we only have a SNAPSHOT (today).
        # Since we don't have historical factor data for every day in the past 5 years (yet),
        # we can only simulate "How would these stocks have performed?".
        # This is a "Current Leaders Analysis", not a true Point-in-Time Backtest.
        
        # We will return a DataFrame with these symbols marked as 'Long' for the entire period.
        # This shows the momentum persistence of the current winners.
        
        # Get all unique dates from the price data (df)
        all_dates = df['date'].unique()
        signals = pd.DataFrame(index=all_dates, columns=candidates['symbol'].unique())
        signals.fillna(1, inplace=True) # Hold all selected stocks
        
        return signals

    except Exception as e:
        logger.error(f"Strategy execution failed: {e}")
        return pd.DataFrame()