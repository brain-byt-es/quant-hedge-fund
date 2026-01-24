from typing import Optional
from omega.trading_app import TradingApp
from loguru import logger

_omega_app_instance: Optional[TradingApp] = None

def get_omega_app() -> TradingApp:
    """
    Get the singleton instance of the TradingApp.
    Initializes it if it doesn't exist.
    """
    global _omega_app_instance
    if _omega_app_instance is None:
        logger.info("Initializing Omega Trading App Singleton...")
        # Default to paper trading for safety
        _omega_app_instance = TradingApp(paper_trading=True)
        
        # Attempt initial connection (safe, non-blocking if fails)
        try:
            if _omega_app_instance.connect():
                logger.info(f"Omega Singleton connected to {_omega_app_instance.broker_type}")
            else:
                logger.warning(f"Omega Singleton failed to connect to {_omega_app_instance.broker_type} on startup")
        except Exception as e:
            logger.error(f"Omega Singleton connection error: {e}")
            
    return _omega_app_instance
