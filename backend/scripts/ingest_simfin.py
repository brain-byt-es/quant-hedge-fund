"""
Script to manually trigger SimFin Bulk Ingestion.
Run this to populate DuckDB with SimFin data immediately.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger

from config.logging_config import setup_logging
from qsconnect import Client


def main():
    setup_logging()
    logger.info("=" * 60)
    logger.info("QS Hedge Fund - SimFin Bulk Ingestion")
    logger.info("=" * 60)

    client = Client()

    try:
        # Check API key presence
        if not client._simfin_api_key or client._simfin_api_key == "free":
            logger.warning("SimFin API key is set to 'free' or missing.")
            logger.warning("Please ensure you have set SIMFIN_API_KEY in your .env file.")

        logger.info("Starting bulk ingestion... (This may take a moment)")
        stats = client.ingest_simfin_bulk()

        logger.info("-" * 60)
        logger.info("Ingestion Summary:")
        for category, count in stats.items():
            logger.info(f"  - {category}: {count} records")
        logger.info("-" * 60)

        print("\n✅ SimFin Data Ingested Successfully!")
        print("You can now verify the data in DuckDB or run the dashboard.")

    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()

