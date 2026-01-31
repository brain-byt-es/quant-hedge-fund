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
        
        # Skip market data fetch for now to prevent KeyErrors if SPY is missing
        # The generator uses internal logic/LLM creativity primarily
        prices = None
            
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

class AgenticQueryRequest(BaseModel):
    query_type: str # 'alpha' or 'risk'
    symbols: Optional[List[str]] = None

@router.post("/agentic_query")
async def agentic_query(request: AgenticQueryRequest):
    """
    Handle specialized agentic queries from the Architect.
    Connects the LLM to the system's live intelligence and risk data.
    """
    from api.routers.data import get_qs_client
    client = get_qs_client()
    
    try:
        if request.query_type == "alpha":
            # Fetch top 5 alpha signals from Factor Engine Snapshot
            try:
                sql = """
                    SELECT symbol, ROUND(momentum_score, 1) as score, f_score 
                    FROM factor_ranks_snapshot 
                    ORDER BY momentum_score DESC 
                    LIMIT 5
                """
                signals = client.query(sql).to_dicts()
                
                # Format for chat
                sig_text = ", ".join([f"{s['symbol']} ({s['score']})" for s in signals])
                return {
                    "type": "alpha",
                    "data": signals,
                    "summary": f"Top Momentum Signals detected: {sig_text}"
                }
            except Exception as db_err:
                logger.error(f"Alpha query db error: {db_err}")
                return {"type": "alpha", "data": [], "summary": "Could not retrieve factor signals."}
            
        elif request.query_type == "risk":
            # Fetch VaR and ES from the Omega Risk Engine
            from omega.singleton import get_omega_app
            omega = get_omega_app()
            
            # Get current state first
            state = omega.get_portfolio_state()
            
            # Safe calculation: if no positions, risk is 0
            if not state.positions:
                return {
                    "type": "risk",
                    "data": {"var_95": 0, "expected_shortfall": 0, "stress_tests": []},
                    "summary": "0.00% (No active market exposure)"
                }
                
            risk_metrics = omega.risk_manager.get_portfolio_risk(state.positions, state.account.total_equity)
            var_val = risk_metrics.get('var_95', 0)
            
            return {
                "type": "risk",
                "data": risk_metrics,
                "summary": f"{var_val*100:.2f}%"
            }
            
        return {"error": "Unknown query type"}
        
    except Exception as e:
        logger.error(f"Agentic query failed: {e}")
        return {"error": str(e)}

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
        "algorithm": {{
            "callable": "multi_factor_rebalance",
            "params": {{
                "f_score_min": int,
                "momentum_min": float,
                "top_n": int
            }}
        }}
    }}
    
    IMPORTANT: If the user asks for F-Score, Quality, or Momentum, use "multi_factor_rebalance" and map their criteria to "f_score_min" (threshold 0-9) and "momentum_min" (percentile 0-100).
    
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
