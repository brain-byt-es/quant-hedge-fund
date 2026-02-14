import os
import sys

from loguru import logger

# Ensure backend is in path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from qsresearch.features.factor_engine import FactorEngine


def test_ratios():
    engine = FactorEngine()
    symbol = "AAPL"
    logger.info(f"Testing ratios for {symbol}...")
    res = engine.get_detailed_metrics(symbol)
    print("--- RESULT ---")
    import json
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    test_ratios()
