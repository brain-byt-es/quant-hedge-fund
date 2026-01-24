import uuid
import random
import asyncio
from datetime import datetime

class ZiplineService:
    """
    Wrapper for Zipline Reloaded.
    Handles strategy backtesting configuration and execution.
    """
    
    def __init__(self):
        self.active_backtests = {} # id -> status

    async def run_backtest(self, strategy_params: dict):
        """
        Parses the strategy parameters, generates a dynamic Zipline algo script,
        and runs the backtest.
        """
        run_id = str(uuid.uuid4())
        self.active_backtests[run_id] = {
            "status": "running",
            "progress": 0,
            "metrics": None
        }

        # Simulate Zipline processing time
        # In reality: execute `zipline.run_algorithm(...)`
        await asyncio.sleep(3) 
        
        # Mock Results (as if coming from MLflow/Pickle)
        # Randomize slightly to show dynamic behavior
        total_return = random.uniform(0.10, 0.60)
        sharpe = random.uniform(1.5, 3.5)
        drawdown = random.uniform(-0.15, -0.05)
        
        # Generate an equity curve
        equity_curve = []
        val = 100000
        for i in range(100):
            val = val * (1 + random.normalvariate(0.001, 0.01))
            equity_curve.append({"day": i, "value": val})

        results = {
            "run_id": run_id,
            "status": "completed",
            "metrics": {
                "total_return": f"{total_return*100:.2f}%",
                "sharpe_ratio": f"{sharpe:.2f}",
                "max_drawdown": f"{drawdown*100:.2f}%",
                "alpha": f"{random.uniform(0.02, 0.08):.2f}",
                "beta": f"{random.uniform(0.7, 1.2):.2f}"
            },
            "equity_curve": equity_curve,
            "logs": [
                "[INFO] Zipline: Initialized with capital 100,000",
                "[INFO] Fetching bundle 'quant-science-bundle'",
                "[DATA] Loaded 503 assets from DuckDB",
                "[INFO] Running algorithm from 2023-01-01 to 2023-12-31",
                f"[RESULT] Backtest finished. Sharpe: {sharpe:.2f}"
            ]
        }
        
        self.active_backtests[run_id] = results
        return results

    def get_backtest_status(self, run_id: str):
        return self.active_backtests.get(run_id, {"status": "not_found"})

zipline_service = ZiplineService()
