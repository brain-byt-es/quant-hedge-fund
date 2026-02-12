from prefect import flow
from automation.prefect_flows import daily_sync_flow
import os

def serve_sync():
    """Start a persistent server that runs the daily sync on a schedule."""
    print("🚀 Starting Persistent Data Maintenance Service...")
    print("⏰ Schedule: Mon-Fri at 01:00 AM New York Time.")
    
    daily_sync_flow.serve(
        name="Daily Hedge Fund Maintenance",
        cron="0 1 * * 1-5",
        tags=["production", "data-engine"]
    )

if __name__ == "__main__":
    serve_sync()