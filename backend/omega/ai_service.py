import os
import json
from openai import OpenAI
from groq import Groq
from loguru import logger
from typing import Dict, Any, Optional

class MarketAnalyst:
    """
    AI-powered market analysis engine using OpenAI (GPT-4) or Groq (Llama 3).
    Transforms structured market data into governance-safe trading insights.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        from dotenv import load_dotenv, find_dotenv
        from pathlib import Path
        import os
        
        # Load env
        env_path = find_dotenv() or (Path(__file__).resolve().parent.parent / '.env')
        load_dotenv(dotenv_path=env_path, override=True)
        
        # Provider Selection
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY") or os.getenv("GROK_API_KEY")
        
        self.provider = "none"
        self.client = None
        self.model = ""

        # Priority 1: OpenAI (GPT-4o)
        if self.openai_key:
            self.provider = "openai"
            self.client = OpenAI(api_key=self.openai_key)
            self.model = "gpt-4o" # or gpt-4-turbo
            logger.info(f"🧠 Initializing AI Service with OpenAI ({self.model})")
            
        # Priority 2: Groq (Llama 3)
        elif self.groq_key:
            self.provider = "groq"
            self.client = Groq(api_key=self.groq_key)
            self.model = "llama-3.3-70b-versatile"
            logger.info(f"🧠 Initializing AI Service with Groq ({self.model})")
            
        else:
             logger.error("❌ No AI API Key (OpenAI or Groq) found!")

    def generate_market_summary(self, symbol: str, snapshot: Dict[str, Any]) -> Dict[str, Any]:
        """Feature 1: AI Market Summary"""
        prompt = f"""
        You are a professional trading assistant.
        Analyze this market snapshot and produce:
        1. A 1-2 sentence market summary
        2. Bias: BULLISH / BEARISH / NEUTRAL
        3. Confidence score (0-100)

        Rules:
        - Do NOT predict future prices
        - Focus on momentum, volume, and context
        
        Snapshot: {json.dumps(snapshot)}
        """
        return self._call_llm(prompt)

    def detect_regime(self, symbol: str, snapshot: Dict[str, Any]) -> Dict[str, Any]:
        """Feature 2: AI Market Regime Detection"""
        prompt = f"""
        Classify the current market regime for {symbol}.
        Choose ONE: [TREND, RANGE, BREAKOUT, HIGH_VOLATILITY, LOW_LIQUIDITY]
        Return JSON with: regime, confidence, reason.
        
        Snapshot: {json.dumps(snapshot)}
        """
        return self._call_llm(prompt)

    def check_risk_guardrail(self, symbol: str, snapshot: Dict[str, Any]) -> Dict[str, Any]:
        """Feature 3: AI Risk Guardrail"""
        prompt = f"""
        Evaluate trade safety for {symbol}.
        Consider: Spread, Liquidity, Volatility, Session.
        Return JSON with: 
        - risk_level: LOW / MEDIUM / HIGH
        - explanation: 1 sentence reason
        
        Snapshot: {json.dumps(snapshot)}
        """
        return self._call_llm(prompt)

    def suggest_trade_levels(self, symbol: str, snapshot: Dict[str, Any]) -> Dict[str, Any]:
        """Feature 4: AI Stop-Loss & Take-Profit"""
        prompt = f"""
        Suggest stop-loss and take-profit levels for {symbol}.
        Rules:
        - Use ATR, VWAP distance, and volatility
        - Risk-reward between 1:1.5 and 1:3
        - No price prediction language
        
        Return JSON with: stop_loss, take_profit, risk_reward, reason
        
        Snapshot: {json.dumps(snapshot)}
        """
        return self._call_llm(prompt)

    def _call_llm(self, user_prompt: str, json_mode: bool = True) -> Any:
        """Internal helper to call LLM (OpenAI or Groq) safely"""
        if not self.client:
            return {"error": "AI Service Disabled"} if json_mode else "AI Service Disabled"
            
        try:
            # Adjust system prompt and params based on mode
            sys_msg = "You are a specialized trading AI. Output strictly valid JSON." if json_mode else "You are a specialized trading AI."
            params = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": sys_msg},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.4,
                "max_tokens": 1024
            }
            
            if json_mode:
                params["response_format"] = {"type": "json_object"}
            
            response = self.client.chat.completions.create(**params)
            content = response.choices[0].message.content
            
            if json_mode:
                return json.loads(content)
            return content
            
        except Exception as e:
            logger.error(f"LLM Call Failed ({self.provider}): {e}")
            return {"error": str(e)} if json_mode else f"Error: {e}"

# Singleton instance
_ANALYST = None

def get_market_analyst(force_refresh=False):
    global _ANALYST
    if _ANALYST is None or force_refresh:
        logger.info("🔄 Refreshing AI Service Instance")
        _ANALYST = MarketAnalyst()
    return _ANALYST
