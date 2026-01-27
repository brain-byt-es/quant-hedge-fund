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

export const api = {
  // Data Layer
      triggerIngestion: async (params: { mode: "daily" | "backfill", start_date?: string }) => {
          const res = await fetch(`${API_BASE_URL}/data/ingest`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(params)
          })
          return res.json()
      },
    
  getIngestionStatus: async () => {
    const res = await fetch(`${API_BASE_URL}/data/status`);
    return res.json();
  },

  getLatestPrices: async (limit: number = 100) => {
    const res = await fetch(`${API_BASE_URL}/data/prices/latest?limit=${limit}`);
    return res.json();
  },
  
  // Research Layer
  runBacktest: async (params: BacktestParams) => {
    const res = await fetch(`${API_BASE_URL}/backtest/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  },
  
  listBacktests: async (limit: number = 20): Promise<BacktestRun[]> => {
    const res = await fetch(`${API_BASE_URL}/backtest/list?limit=${limit}`);
    if (!res.ok) return [];
    return res.json();
  },
  
  triggerMockBacktest: async (): Promise<void> => {
      await fetch(`${API_BASE_URL}/backtest/run_test`, { method: "POST" });
  },

  getBacktestResults: async (runId: string) => {
    const res = await fetch(`${API_BASE_URL}/backtest/run/${runId}`);
    return res.json();
  },

  // AI Layer
  analyzeBacktest: async (runId: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/analyze_backtest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_id: runId }),
      });
      return res.json();
  },

  generateStrategyConfig: async (prompt: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/generate_strategy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
      });
      return res.json();
  },

  generateFactorCode: async (prompt: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/generate_code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
      });
      return res.json();
  },

  generateHypotheses: async (n: number = 3) => {
      const res = await fetch(`${API_BASE_URL}/ai/generate_hypotheses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ n }),
      });
      return res.json();
  },

  // Live Execution Layer
  getLiveStatus: async () => {
    const res = await fetch(`${API_BASE_URL}/live/status`);
    return res.json();
  },

  getPortfolio: async () => {
    const res = await fetch(`${API_BASE_URL}/live/positions`);
    return res.json();
  },
  
  submitOrder: async (order: OrderParams) => {
    const res = await fetch(`${API_BASE_URL}/live/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
    });
    return res.json();
  },

  haltSystem: async () => {
    const res = await fetch(`${API_BASE_URL}/live/halt`, { method: "POST" });
    return res.json();
  },

  resumeSystem: async () => {
    const res = await fetch(`${API_BASE_URL}/live/resume`, { method: "POST" });
    return res.json();
  },

  configureBroker: async (active_broker: string) => {
    const res = await fetch(`${API_BASE_URL}/live/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_broker }),
    });
    return res.json();
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
