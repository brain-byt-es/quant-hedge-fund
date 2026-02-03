const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api";

export interface IngestionParams {
  start_date: string;
  end_date?: string;
  symbols?: string[];
}

export interface BacktestParams {
  strategy_name?: string;
  bundle_name?: string;
  start_date: string;
  end_date: string;
  capital_base?: number;
  benchmark?: string;
  experiment_name?: string;
  algorithm?: Record<string, unknown>;
  preprocessing?: Record<string, unknown>[];
  factors?: Record<string, unknown>[];
  params?: Record<string, unknown>; // For generic params passing
}

export interface OrderParams {
  symbol: string;
  quantity: number;
  side: 'BUY' | 'SELL';
  order_type?: string;
  limit_price?: number;
}

export interface BacktestRun {
  run_id: string;
  strategy_name: string;
  start_time: string;
  sharpe_ratio: number;
  annual_return: number;
  max_drawdown: number;
  alpha: number;
  beta: number;
  status: string;
}

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP error! status: ${res.status}`);
  }
  return res.json();
};

export const api = {
  // Data Layer
      triggerIngestion: async (params: { mode: "daily" | "backfill" | "simfin", start_date?: string }) => {
          const res = await fetch(`${API_BASE_URL}/data/ingest`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(params)
          })
          return handleResponse(res)
      },
    
  getIngestionStatus: async () => {
    const res = await fetch(`${API_BASE_URL}/data/status`);
    return handleResponse(res);
  },

  getDataHealth: async () => {
    const res = await fetch(`${API_BASE_URL}/data/health`);
    return handleResponse(res);
  },

  getDataStats: async () => {
    const res = await fetch(`${API_BASE_URL}/data/stats`);
    return handleResponse(res);
  },

  getLatestPrices: async (limit = 100) => {
    const res = await fetch(`${API_BASE_URL}/data/prices/latest?limit=${limit}`);
    return handleResponse(res);
  },

  getResearchSignals: async (lookback = 252) => {
    const res = await fetch(`${API_BASE_URL}/research/signals?lookback=${lookback}`);
    return handleResponse(res);
  },

  triggerFactorUpdate: async (min_mcap?: number, min_volume?: number) => {
    let url = `${API_BASE_URL}/research/update_factors`;
    const params = new URLSearchParams();
    if (min_mcap) params.append("min_mcap", min_mcap.toString());
    if (min_volume) params.append("min_volume", min_volume.toString());
    if (params.toString()) url += `?${params.toString()}`;
    
    const res = await fetch(url, { method: "POST" });
    return handleResponse(res);
  },

  getCompanyProfile: async (symbol: string) => {
    const res = await fetch(`${API_BASE_URL}/research/profile/${symbol}`);
    return handleResponse(res);
  },

  getPriceHistory: async (symbol: string, lookback = 252) => {
    const res = await fetch(`${API_BASE_URL}/research/price-history/${symbol}?lookback=${lookback}`);
    return handleResponse(res);
  },

  getIntradayChart: async (symbol: string) => {
    const res = await fetch(`${API_BASE_URL}/research/intraday/${symbol}`);
    return handleResponse(res);
  },

  getAlgorithmsCode: async () => {
    const res = await fetch(`${API_BASE_URL}/research/algorithms/code`);
    return handleResponse(res);
  },

  updateAlgorithmsCode: async (code: string) => {
    const res = await fetch(`${API_BASE_URL}/research/algorithms/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
    });
    return handleResponse(res);
  },

  getStock360: async (symbol: string) => {
    const res = await fetch(`${API_BASE_URL}/research/stock-360/${symbol}`);
    return handleResponse(res);
  },

  getTacticalScanner: async (min_price = 2.0, max_price = 20.0, min_gain = 10.0, date?: string, type = "low_float_rocket") => {
    let url = `${API_BASE_URL}/tactical/momentum-scanner?min_price=${min_price}&max_price=${max_price}&min_gain=${min_gain}&type=${type}`;
    if (date) {
        url += `&date=${date}`;
    }
    const res = await fetch(url);
    return handleResponse(res);
  },

  // Research Layer
  runBacktest: async (params: BacktestParams) => {
    const res = await fetch(`${API_BASE_URL}/backtest/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },
  
  listBacktests: async (limit: number = 20): Promise<BacktestRun[]> => {
    const res = await fetch(`${API_BASE_URL}/backtest/list?limit=${limit}`);
    return handleResponse(res);
  },
  
  triggerMockBacktest: async (): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/backtest/run_test`, { method: "POST" });
      return handleResponse(res);
  },

  getBacktestResults: async (runId: string) => {
    const res = await fetch(`${API_BASE_URL}/backtest/run/${runId}`);
    return handleResponse(res);
  },

  // AI Layer
  analyzeBacktest: async (runId: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/analyze_backtest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_id: runId }),
      });
      return handleResponse(res);
  },

  generateStrategyConfig: async (prompt: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/generate_strategy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
      });
      return handleResponse(res);
  },

  generateFactorCode: async (prompt: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/generate_code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
      });
      return handleResponse(res);
  },

  deployFactorCode: async (code: string, factor_name: string = "custom_momentum") => {
      const res = await fetch(`${API_BASE_URL}/ai/deploy_code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, factor_name }),
      });
      return handleResponse(res);
  },

  generateHypotheses: async (n: number = 3) => {
      const res = await fetch(`${API_BASE_URL}/ai/generate_hypotheses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ n }),
      });
      return handleResponse(res);
  },

  agenticQuery: async (query_type: 'alpha' | 'risk') => {
      const res = await fetch(`${API_BASE_URL}/ai/agentic_query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query_type }),
      });
      return handleResponse(res);
  },

  chat: async (message: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
      });
      return handleResponse(res);
  },

  // Live Execution Layer
  getLiveStatus: async () => {
    const res = await fetch(`${API_BASE_URL}/live/status`);
    return handleResponse(res);
  },

  getPortfolio: async () => {
    const res = await fetch(`${API_BASE_URL}/live/positions`);
    return handleResponse(res);
  },
  
  submitOrder: async (order: OrderParams) => {
    const res = await fetch(`${API_BASE_URL}/live/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
    });
    return handleResponse(res);
  },

  haltSystem: async () => {
    const res = await fetch(`${API_BASE_URL}/live/halt`, { method: "POST" });
    return handleResponse(res);
  },

  resumeSystem: async () => {
    const res = await fetch(`${API_BASE_URL}/live/resume`, { method: "POST" });
    return handleResponse(res);
  },

  configureBroker: async (active_broker: string) => {
    const res = await fetch(`${API_BASE_URL}/live/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_broker }),
    });
    return handleResponse(res);
  }
};

export const connectWebSocket = (endpoint: string, onMessage: (data: unknown) => void) => {
    // endpoint should be absolute or relative to WS_BASE_URL
    // e.g., "/live/ws/ticks"
    const url = endpoint.startsWith("ws") ? endpoint : `${WS_BASE_URL}${endpoint}`;
    
    logger.debug(`Connecting WS to ${url}`);
    const ws = new WebSocket(url);
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessage(data);
        } catch (e) {
            console.error("WS Parse Error", e);
        }
    };
    
    return ws;
};

const logger = {
    debug: (msg: string) => {
        if (process.env.NODE_ENV === 'development') console.debug(`[API] ${msg}`);
    }
}
