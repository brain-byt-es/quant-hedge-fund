"""
QS Connect - AI API Router

Handles AI-powered analysis and generation tasks.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from loguru import logger
import mlflow
from mlflow.tracking import MlflowClient

from omega.ai_service import get_market_analyst
from qsresearch.llm.strategy_generator import StrategyGenerator
from api.routers.backtest import get_mlflow_client, _format_run, MLFLOW_EXPERIMENT_NAME

router = APIRouter()

class AnalyzeRequest(BaseModel):
    run_id: str

class StrategyRequest(BaseModel):
    prompt: str
    universe: str = "sp500"

class CodeGenRequest(BaseModel):
    prompt: str
    factor_type: str = "momentum"

class HypothesisRequest(BaseModel):
    n: int = 3
    universe: str = "sp500"

@router.post("/generate_hypotheses")
async def generate_hypotheses(request: HypothesisRequest):
    """
    Generate multiple diverse strategy hypotheses based on current market regime.
    Uses StrategyGenerator to analyze market state first.
    """
    try:
        # Initialize generator
        generator = StrategyGenerator()
        
        # We need recent price data to analyze regime
        # Using QSConnect client to fetch a sample (e.g. SPY or top 50)
        from api.routers.data import get_qs_client
        client = get_qs_client()
        
        # Fetch SPY history for regime analysis
        prices = client.bulk_historical_prices(
            start_date=None, # Auto-defaults
            symbols=["SPY"],
            use_cache=True
        )
        
        if prices is None or prices.is_empty():
            logger.warning("No market data available for regime analysis. Using neutral defaults.")
            # Generator handles empty data gracefully usually, or we mock it
            
        candidates = generator.generate_candidates(prices, n=request.n)
        return candidates
        
    except Exception as e:
        logger.error(f"Hypothesis generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze_backtest")
async def analyze_backtest(request: AnalyzeRequest):
    """
    Analyze a completed backtest run using AI.
    """
    client = get_mlflow_client()
    try:
        run = client.get_run(request.run_id)
        run_data = _format_run(run)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Run not found: {e}")

    analyst = get_market_analyst()
    if not analyst:
        raise HTTPException(status_code=503, detail="AI Service unavailable")

    # Construct prompt for AI
    metrics = run_data["metrics"]
    strategy_name = run_data["strategy_name"]
    
    prompt = f"""
    Analyze this backtest result for strategy '{strategy_name}'.
    
    Key Metrics:
    - Sharpe Ratio: {metrics.get('sharpe', 'N/A')}
    - Annual Return: {metrics.get('annual_return', 'N/A')}
    - Max Drawdown: {metrics.get('max_drawdown', 'N/A')}
    - Alpha: {metrics.get('alpha', 'N/A')}
    - Beta: {metrics.get('beta', 'N/A')}
    - Volatility: {metrics.get('volatility', 'N/A')}
    
    Provide a concise assessment:
    1. Performance verdict (Strong/Weak/Neutral)
    2. Risk analysis (Is it safe?)
    3. Recommendations for improvement (Parameters to tune)
    
    Output JSON with keys: "verdict", "risk_analysis", "recommendation".
    """
    
    try:
        analysis = analyst._call_llm(prompt)
        
        # Log analysis as artifact to MLflow
        with mlflow.start_run(run_id=request.run_id):
            import json
            with open("ai_analysis.json", "w") as f:
                json.dump(analysis, f)
            mlflow.log_artifact("ai_analysis.json")
            
        return analysis
    except Exception as e:
        logger.error(f"AI Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_strategy")
async def generate_strategy(request: StrategyRequest):
    """
    Generate a backtest configuration based on a user prompt.
    """
    analyst = get_market_analyst()
    if not analyst:
        raise HTTPException(status_code=503, detail="AI Service unavailable")
        
    prompt = f"""
    Generate a valid JSON configuration for a quantitative trading strategy based on this request:
    "{request.prompt}"
    
    The configuration must match this schema:
    {{
        "strategy_name": "string",
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD",
        "capital_base": float,
        "benchmark": "SPY",
        "params": {{
            "window": int,
            "threshold": float,
            ...other params relevant to the strategy
        }}
    }}
    
    Defaults: 
    - Start date: 2020-01-01
    - End date: 2024-12-31
    - Capital: 100000
    
    Return ONLY the JSON.
    """
    
    try:
        config = analyst._call_llm(prompt)
        return config
    except Exception as e:
        logger.error(f"Strategy generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_code")
async def generate_code(request: CodeGenRequest):
    """
    Generate Python code for a new Alpha Factor.
    """
    analyst = get_market_analyst()
    if not analyst:
        raise HTTPException(status_code=503, detail="AI Service unavailable")
        
    prompt = f"""
    Generate a Python function for a quantitative alpha factor.
    Type: {request.factor_type}
    Description: {request.prompt}
    
    Signature:
    def compute_factor(prices: pd.DataFrame, **kwargs) -> pd.Series:
        # prices has columns: open, high, low, close, volume
        # Index is DatetimeIndex
        pass
        
    Return JSON with keys: "code", "explanation".
    """
    
    try:
        result = analyst._call_llm(prompt)
        return result
    except Exception as e:
        logger.error(f"Code generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
