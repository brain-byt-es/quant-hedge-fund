from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional

class BaseBroker(ABC):
    """
    Abstract Base Class for Broker Adapters.
    Defines the standard interface for all trading operations.
    """
    
    @abstractmethod
    def connect(self) -> bool:
        pass
        
    @abstractmethod
    def is_connected(self) -> bool:
        pass
        
    @abstractmethod
    def get_account_info(self) -> Dict[str, Any]:
        """Returns normalized account info: {NetLiquidation, BuyingPower, Currency, ...}"""
        pass
        
    @abstractmethod
    def get_positions(self) -> List[Dict[str, Any]]:
        """Returns normalized positions list"""
        pass
        
    @abstractmethod
    def get_quote(self, symbol: str) -> Dict[str, float]:
        """Returns {bid, ask, last, volume}"""
        pass
        
    @abstractmethod
    def submit_order(self, symbol: str, quantity: int, side: str, order_type: str, price: float = None) -> Optional[Any]:
        pass
        
    @abstractmethod
    def get_open_orders(self) -> List[Dict[str, Any]]:
        pass
        
    @abstractmethod
    def get_recent_orders(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns normalized list of recent order executions."""
        pass
        
    @abstractmethod
    def cancel_all_orders(self) -> int:
        pass
