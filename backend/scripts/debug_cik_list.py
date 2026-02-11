from qsconnect.api.fmp_client import FMPClient
from config.settings import get_settings
import pandas as pd
from loguru import logger

def debug_cik():
    settings = get_settings()
    client = FMPClient(api_key=settings.fmp_api_key)
    
    url = "https://financialmodelingprep.com/stable/cik-list?limit=5"
    data = client._make_request(url)
    
    print("\n--- FMP CIK List Raw Sample ---")
    print(data)
    
    if data and len(data) > 0:
        df = pd.DataFrame(data)
        print("\n--- DataFrame Columns ---")
        print(df.columns.tolist())
        print("\n--- First Row ---")
        print(df.iloc[0].to_dict())

if __name__ == "__main__":
    debug_cik()
