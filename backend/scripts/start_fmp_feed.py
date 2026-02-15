"""
Script to start the FMP Real-Time WebSocket Feed.
"""
import os
import sys
import asyncio
from pathlib import Path

# Add project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from omega.data.fmp_feed import start_feed

if __name__ == "__main__":
    try:
        asyncio.run(start_feed())
    except KeyboardInterrupt:
        print("
🛑 FMP Feed stopped by user.")
