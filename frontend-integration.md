# Frontend Integration Guide

This guide explains how to connect the Next.js frontend to the Python FastAPI backend.

## 1. Setup API Client

Create `src/lib/api.ts` to handle HTTP requests and WebSocket connections.

```typescript
// src/lib/api.ts
const API_BASE_URL = "http://localhost:8000/api";
const WS_BASE_URL = "ws://localhost:8000";

export const api = {
  // Data Ingestion
  triggerIngestion: async () => {
    const res = await fetch(`${API_BASE_URL}/data/refresh`, { method: "POST" });
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
  getPortfolio: async () => {
    const res = await fetch(`${API_BASE_URL}/live/portfolio`);
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

export const connectWebSocket = (path: string, onMessage: (data: any) => void) => {
    const ws = new WebSocket(`${WS_BASE_URL}${path}`);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onMessage(data);
    };
    return ws;
};
```

## 2. Component Integration Examples

### A. Data Ingestion (Process Monitor)

In `src/components/data/process-monitor.tsx`:

```tsx
import { useEffect, useState } from "react";
import { connectWebSocket, api } from "@/lib/api";

// ... inside component
const [status, setStatus] = useState<any>(null);

useEffect(() => {
    // Connect to WebSocket
    const ws = connectWebSocket("/api/data/ws/status", (data) => {
        setStatus(data);
    });
    return () => ws.close();
}, []);

const handleStartIngestion = async () => {
    await api.triggerIngestion();
};
```

### B. Live Portfolio (Dashboard)

In `src/components/dashboard/portfolio-chart.tsx` or `src/app/live/page.tsx`:

```tsx
import { useEffect, useState } from "react";
import { connectWebSocket } from "@/lib/api";

// ... inside component
const [portfolio, setPortfolio] = useState<any>(null);

useEffect(() => {
    const ws = connectWebSocket("/api/live/stream", (msg) => {
        if (msg.type === "portfolio_update") {
            setPortfolio(msg.data);
        }
    });
    return () => ws.close();
}, []);
```

## 3. Running the Backend

1.  Navigate to `backend/`.
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Run the server:
    ```bash
    uvicorn app.main:app --reload
    ```
