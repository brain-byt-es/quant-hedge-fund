"""
QS Connect - Base API Client

Abstract base class for all API clients with rate limiting and error handling.
"""

import time
import threading
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

import requests
from loguru import logger


class BaseAPIClient(ABC):
    """Base class for API clients with rate limiting."""
    
    def __init__(
        self,
        base_url: str,
        api_key: str,
        rate_limit_per_minute: int = 300,
    ):
        """
        Initialize the API client.
        
        Args:
            base_url: Base URL for API endpoints
            api_key: API key for authentication
            rate_limit_per_minute: Maximum requests per minute
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.rate_limit_per_minute = rate_limit_per_minute
        self._last_request_time = 0.0
        self._min_interval = 60.0 / rate_limit_per_minute
        self._lock = threading.Lock()
        
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "User-Agent": "QSConnect/1.0",
        })
    
    def _rate_limit(self) -> None:
        """
        Enforce rate limiting with non-blocking scheduling.
        Allows multiple threads to calculate their sleep time concurrently.
        """
        with self._lock:
            now = time.time()
            # If the last request was long ago, reset the clock to now
            if self._last_request_time < now:
                self._last_request_time = now
            
            # Schedule this request for the next available slot
            scheduled_time = self._last_request_time + self._min_interval
            self._last_request_time = scheduled_time
            
        # Sleep outside the lock so other threads can schedule themselves
        sleep_duration = scheduled_time - time.time()
        if sleep_duration > 0:
            time.sleep(sleep_duration)
    
    def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        method: str = "GET",
        retry_count: int = 3,
        retry_delay: float = 1.0,
    ) -> Optional[Dict[str, Any]]:
        """
        Make an API request with rate limiting and retries.
        """
        if endpoint.startswith("http"):
            url = endpoint
        else:
            url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        # Add API key to params
        if params is None:
            params = {}
        params["apikey"] = self.api_key
        
        for attempt in range(retry_count):
            try:
                self._rate_limit()
                
                if method.upper() == "GET":
                    response = self.session.get(url, params=params, timeout=30)
                else:
                    response = self.session.post(url, json=params, timeout=30)
                
                response.raise_for_status()
                
                data = response.json()
                return data
                
            except requests.exceptions.HTTPError as e:
                logger.warning(f"HTTP error on attempt {attempt + 1}: {e}")
                if response.status_code == 429:  # Rate limited
                    time.sleep(retry_delay * (attempt + 1) * 2)
                elif response.status_code >= 500:
                    time.sleep(retry_delay * (attempt + 1))
                else:
                    raise
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request error on attempt {attempt + 1}: {e}")
                time.sleep(retry_delay * (attempt + 1))
        
        logger.error(f"Failed to complete request after {retry_count} attempts: {endpoint}")
        return None
    
    @abstractmethod
    def get_stock_list(self):
        """Get list of available stocks."""
        pass
