"""
Script to trigger Factor Engine ranking.
Updates the `factor_ranks_snapshot` and `factor_history` tables in DuckDB.
"""

import argparse
import sys
from pathlib import Path

# Add project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger

from qsresearch.features.factor_engine import FactorEngine


def main():
    parser = argparse.ArgumentParser(description="Update Factor Engine rankings.")
    parser.add_argument("--historical", action="store_true", help="Calculate historical factors")
    parser.add_argument("--start", type=str, default="2023-01-01", help="Start date for historical calculation")
    parser.add_argument("--end", type=str, default=None, help="End date for historical calculation")
    parser.add_argument("--frequency", type=str, default="monthly", choices=["monthly", "weekly"], help="Frequency for historical calculation")
    
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("QS Hedge Fund - Factor Ranking Update")
    logger.info("=" * 60)

    engine = FactorEngine()

    try:
        if args.historical:
            from datetime import datetime
            end_date = args.end or datetime.now().strftime("%Y-%m-%d")
            logger.info(f"Running historical factor calculation from {args.start} to {end_date}...")
            count = engine.calculate_historical_factors(args.start, end_date, frequency=args.frequency)
            logger.success(f"Successfully calculated {count} historical factor records.")
        else:
            count = engine.calculate_universe_ranks()
            logger.success(f"Successfully ranked {count} symbols in snapshot.")
            print(f"\n✅ Factor DNA calculated for {count} companies!")
            print("The Radar Charts in the dashboard will now show real data.")

    except Exception as e:
        logger.error(f"Ranking failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

