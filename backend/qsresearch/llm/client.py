"""
Groq LLM Client
Wrapper around the Groq API (via OpenAI SDK) for the Quant Hedge Fund system.
"""

import json
import os
from typing import Any, Dict, Optional

from loguru import logger
from openai import OpenAI


class LLMClient:
    """Client for interacting with LLM APIs (OpenAI or Groq)."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize the LLM client. Priorities: OpenAI > Groq.
        """
        from dotenv import load_dotenv

        # Explicitly load .env to ensure keys are available
        load_dotenv()

        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.groq_key = api_key or os.getenv("GROQ_API_KEY")

        self.provider = "none"
        self.client = None

        if self.openai_key:
            self.provider = "openai"
            self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o")
            self.client = OpenAI(api_key=self.openai_key)
            logger.info(f"LLM Client initialized with OpenAI ({self.model})")

        elif self.groq_key:
            self.provider = "groq"
            self.model = model or os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")
            self.client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=self.groq_key,
            )
            logger.info(f"LLM Client initialized with Groq ({self.model})")
        else:
            logger.warning("No LLM API keys found. AI features disabled.")

    def generate_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        json_mode: bool = False
    ) -> str:
        """
        Generate a completion from the LLM.
        """
        if not self.client:
            raise ValueError("LLM Client not initialized")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error calling LLM API ({self.provider}): {e}")
            raise

    def generate_strategy_params(self, market_regime: Dict[str, Any]) -> Dict[str, Any]:
        """
        Specialized method to generate strategy parameters from a regime dict.
        """
        system_prompt = """
        You are an expert Quantitative Researcher assistant.
        Your goal is to analyze market regime metrics and suggest optimal parameters for a Factor-based strategy.
        
        Output MUST be a JSON object with this exact structure:
        {
            "config": {
                "strategy_name": "Creative_Name_Here", // e.g., 'Vol_Crusher_Alpha', 'Steady_Growth_Quality'
                "top_n": int, // 10-50
                "momentum_window": [int, int], // (fast, slow)
                "rebalance_frequency": "month_end" or "quarter_end",
                "factor_weights": {"momentum": float, "value": float, "quality": float} // Sum to 1.0
            },
            "reasoning": "Detailed explanation of why these params fit the regime."
        }
        """

        regime_str = json.dumps(market_regime, indent=2)
        user_prompt = f"""
        Current Market Regime Metrics:
        {regime_str}
        
        Based on these metrics, suggest the optimal strategy configuration.
        Explain your reasoning in a 'reasoning' field, but ensure the 'config' field contains the parameters.
        """

        response = self.generate_completion(
            system_prompt,
            user_prompt,
            temperature=0.2,
            json_mode=True
        )

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON response: {response}")
            raise

# Alias for backward compatibility
GroqClient = LLMClient
