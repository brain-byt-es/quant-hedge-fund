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

  getResearchSignals: async (lookback = 252, min_mcap = 0, min_volume = 0) => {
    const res = await fetch(`${API_BASE_URL}/research/signals?lookback=${lookback}&min_mcap=${min_mcap}&min_volume=${min_volume}`);
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

  getStockRatios: async (symbol: string) => {
    const res = await fetch(`${API_BASE_URL}/research/stock-ratios/${symbol}`);
    return handleResponse(res);
  },

  getFinancials: async (symbol: string) => {
    const res = await fetch(`${API_BASE_URL}/research/financials/${symbol}`);
    return handleResponse(res);
  },

  getIndustryDetails: async (category: string, countries?: string[]) => {
    let url = `${API_BASE_URL}/search/industry/${encodeURIComponent(category)}`;
    if (countries && countries.length > 0) {
      const params = new URLSearchParams();
      countries.forEach(c => params.append('countries', c));
      url += `?${params.toString()}`;
    }
    const res = await fetch(url);
    return handleResponse(res);
  },

  getInsiderTrades: async (limit = 100) => {
    const res = await fetch(`${API_BASE_URL}/research/insider-trades?limit=${limit}`);
    return handleResponse(res);
  },

  getPoliticianTrades: async (limit = 100) => {
    const res = await fetch(`${API_BASE_URL}/research/politician-trades?limit=${limit}`);
    return handleResponse(res);
  },

  getPoliticianHistory: async (name: string, limit = 100) => {
    const res = await fetch(`${API_BASE_URL}/research/politician-history/${encodeURIComponent(name)}?limit=${limit}`);
    return handleResponse(res);
  },

  getRedditSentiment: async () => {
    const res = await fetch(`${API_BASE_URL}/research/reddit-sentiment`);
    return handleResponse(res);
  },

  getHedgeFunds: async (search?: string) => {
    let url = `${API_BASE_URL}/research/hedge-funds`;
    if (search) url += `?search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  getHedgeFundHoldings: async (cik: string, limit = 100) => {
    const res = await fetch(`${API_BASE_URL}/research/hedge-funds/holdings/${cik}?limit=${limit}`);
    return handleResponse(res);
  },

  getIPOCalendar: async () => {
    const res = await fetch(`${API_BASE_URL}/research/ipo-calendar`);
    return handleResponse(res);
  },

  getEarningsCalendar: async () => {
    const res = await fetch(`${API_BASE_URL}/research/earnings-calendar`);
    return handleResponse(res);
  },

  getDividendsCalendar: async () => {
    const res = await fetch(`${API_BASE_URL}/research/dividends-calendar`);
    return handleResponse(res);
  },

  getEconomicCalendar: async () => {
    const res = await fetch(`${API_BASE_URL}/research/economic-calendar`);
    return handleResponse(res);
  },

  getCongressFlow: async (limit = 100) => {
    const res = await fetch(`${API_BASE_URL}/research/congress-flow?limit=${limit}`);
    return handleResponse(res);
  },

  getComparisonData: async (tickerList: string[], category: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE_URL}/research/compare-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickerList, category }),
    });
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

  // Global Search & Master Index
  globalSearch: async (query: string, limit = 20, asset_type?: string, countries?: string[]) => {
      let url = `${API_BASE_URL}/search/global?query=${encodeURIComponent(query)}&limit=${limit}`;
      if (asset_type) url += `&asset_type=${asset_type}`;
      if (countries && countries.length > 0) {
          countries.forEach(c => url += `&countries=${encodeURIComponent(c)}`);
      }
      const res = await fetch(url);
      return handleResponse(res);
  },

  getAssetFilterOptions: async (column: string, asset_type?: string) => {
      let url = `${API_BASE_URL}/search/options?column=${column}`;
      if (asset_type) url += `&asset_type=${asset_type}`;
      const res = await fetch(url);
      return handleResponse(res);
  },

  getAssetList: async (asset_type: string, filters?: Record<string, string | string[]>, limit = 50, offset = 0) => {
      let url = `${API_BASE_URL}/search/list?asset_type=${asset_type}&limit=${limit}&offset=${offset}`;
      if (filters) {
          Object.entries(filters).forEach(([k, v]) => {
              if (v) {
                  if (Array.isArray(v)) {
                      v.forEach(val => url += `&${k}=${encodeURIComponent(val)}`);
                  } else {
                      url += `&${k}=${encodeURIComponent(v)}`;
                  }
              }
          });
      }
      const res = await fetch(url);
      return handleResponse(res);
  },

  scanMarket: async (filters: {
      min_price?: number;
      max_price?: number;
      min_volume?: number;
      min_relative_volume?: number;
      min_gap_percent?: number;
      max_gap_percent?: number;
      min_market_cap?: number;
      max_float?: number;
      limit?: number;
  }) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
              params.append(key, value.toString());
          }
      });
      const res = await fetch(`${API_BASE_URL}/screener/scan?${params.toString()}`);
      return handleResponse(res);
  },

  getSectors: async (limit = 200, group_by: 'sector' | 'industry' = 'industry') => {
      const res = await fetch(`${API_BASE_URL}/search/sectors?limit=${limit}&group_by=${group_by}`);
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

  getRecentOrders: async (limit = 50) => {
    const res = await fetch(`${API_BASE_URL}/live/orders?limit=${limit}`);
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
