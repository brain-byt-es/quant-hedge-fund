"""
Script to trigger Factor Engine ranking.
Updates the `factor_ranks_snapshot` table in DuckDB.
"""

import sys
from pathlib import Path

# Add project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger

from qsresearch.features.factor_engine import FactorEngine


def main():
    logger.info("=" * 60)
    logger.info("QS Hedge Fund - Factor Ranking Update")
    logger.info("=" * 60)

    engine = FactorEngine()

    try:
        count = engine.calculate_universe_ranks()
        logger.success(f"Successfully ranked {count} symbols.")
        print(f"\n✅ Factor DNA calculated for {count} companies!")
        print("The Radar Charts in the dashboard will now show real data.")

    except Exception as e:
        logger.error(f"Ranking failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

