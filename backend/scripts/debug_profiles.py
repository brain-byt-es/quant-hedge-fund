from qsconnect.api.fmp_client import FMPClient
from config.settings import get_settings
import pandas as pd
import json

def debug_profiles():
    settings = get_settings()
    client = FMPClient(api_key=settings.fmp_api_key)
    
    # Test SINGLE symbol on stable
    url = "https://financialmodelingprep.com/stable/profile?symbol=AAPL"
    data = client._make_request(url)
    
    print("\n--- FMP Stable Profile (Single) ---")
    print(json.dumps(data, indent=2))

if __name__ == "__main__":
    debug_profiles()
