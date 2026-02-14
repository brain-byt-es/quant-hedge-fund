"""
QS Research - Base Strategy Class
Provides a structured interface for strategies to avoid raw exec() calls.
"""

from abc import ABC, abstractmethod
from typing import Any


class BaseStrategy(ABC):
    """
    Base class for all Quant Science strategies.
    Mimics the Zipline API while allowing for safer execution.
    """
    
    def __init__(self):
        self.context = None
    
    @abstractmethod
    def initialize(self, context: Any):
        """Called once at the start of the backtest."""
        pass
    
    @abstractmethod
    def handle_data(self, context: Any, data: Any):
        """Called for every bar of data."""
        pass

    def before_trading_start(self, context: Any, data: Any):
        """Optional: Called every day before market open."""
        pass
