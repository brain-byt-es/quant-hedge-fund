const API_BASE_URL = "http://localhost:8000/api";
const WS_BASE_URL = "ws://localhost:8000/api"; // Note: FastAPI router prefix might affect WS path depending on mount

export const api = {
  // Data Ingestion
  triggerIngestion: async (params: any = {}) => {
    const res = await fetch(`${API_BASE_URL}/data/ingest`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
    });
    return res.json();
  },
  
  getIngestionStatus: async () => {
    const res = await fetch(`${API_BASE_URL}/data/status`);
    return res.json();
  },
  
  // Research
  runBacktest: async (params: any) => {
    const res = await fetch(`${API_BASE_URL}/backtest/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  },
  
  getBacktestResults: async (runId: string) => {
    const res = await fetch(`${API_BASE_URL}/backtest/${runId}/results`);
    return res.json();
  },

  // Live Trading
  getLiveStatus: async () => {
    const res = await fetch(`${API_BASE_URL}/live/status`);
    return res.json();
  },

  getPortfolio: async () => {
    const res = await fetch(`${API_BASE_URL}/live/positions`);
    return res.json();
  },
  
  submitOrder: async (order: any) => {
    const res = await fetch(`${API_BASE_URL}/live/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
    });
    return res.json();
  }
};

export const connectWebSocket = (endpoint: string, onMessage: (data: any) => void) => {
    // endpoint example: "/data/ws/status"
    const ws = new WebSocket(`ws://localhost:8000/api${endpoint}`);
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
