# Quant Hedge Fund System (Integrated Platform)

## Project Context
This project is a professional-grade quantitative trading platform. It integrates a high-performance Python backend (QS Connect, QS Research, Omega) with a modern Next.js 14 frontend and a Streamlit operational control plane.

## Unified Architecture

### 1. Backend (Python 3.13)
Located in `/backend`, providing the core logic:
- **Data Layer (QS Connect):** Ingests market/fundamental data from FMP/Datalink into **DuckDB** and Parquet caches.
- **Research Layer (QS Research):** Strategy development and backtesting using **Zipline-Reloaded** and **MLflow** for experiment tracking.
- **Execution Layer (Omega):** Live/Paper trading via **Interactive Brokers (IBKR)** with centralized risk management.
- **Real-Time Layer:** TIP-Search low-latency scheduler and deterministic candle truth-layer.
- **AI Insights:** Market analysis and regime detection powered by **Groq**.

### 2. Operational Control Plane (Streamlit)
Exposed on `localhost:8501`. Serves as the "Admin Cockpit":
- Emergency HALT/RESUME controls.
- Real-time candle truth-layer visualization (Plotly).
- Strategy approval and governance audit logs.
- AI market analysis engine.

### 3. Frontend (Next.js 14 / TypeScript)
Exposed on `localhost:3000`. Serves as the "Executive Dashboard":
- High-level KPI monitoring (Total P&L, Alpha, Sharpe).
- Simplified data ingestion and backtest triggers via REST API.
- Modern, high-density UI using `shadcn/ui` and `Tailwind CSS`.

## Core Tech Stack
- **Frontend:** Next.js (App Router), Lucide Icons, Shadcn/UI, Tailwind.
- **Backend API:** FastAPI (port 8000).
- **Database:** DuckDB (OLAP) + Parquet (Caching).
- **Execution:** `ib-insync` (IBKR API).
- **AI:** Groq LPU (Llama 3 / Mixtral).

## Infrastructure & Workflows

### 1. Service Orchestration
The entire stack is managed via `start.sh`:
```bash
./start.sh
```
This launches:
- **FastAPI:** `http://localhost:8000` (API Gateway)
- **Streamlit:** `http://localhost:8501` (Admin Panel)
- **Next.js:** `http://localhost:3000` (Main Dashboard)

### 2. Environment Configuration
- `.env` in root handles platform-wide settings.
- `backend/.env` handles Python-specific API keys (FMP, Groq, IBKR).

### 3. Data Flow
1. **Ingest:** Frontend/API -> QS Connect -> DuckDB.
2. **Backtest:** Research Lab -> Zipline -> Metrics -> MLflow.
3. **Trade:** Omega -> Risk Engine -> IBKR -> Live Market.

## Design Principles
- **Aesthetic:** "Precision Industrial" (Dark Mode, Gunmetal/Cyan).
- **Typography:** `JetBrains Mono` for all financial figures (CRITICAL).
- **Security:** Backend-enforced risk limits and manual emergency halt.

## Development Guidelines for AI Agents
- **Backend Modifications:** Ensure any new logic in `backend/` is exposed via `backend/main.py` if it needs to be consumed by the React frontend.
- **Database:** Use `DuckDBManager` for all SQL operations to ensure connection pooling and safety.
- **Styles:** Stick to `shadcn/ui` patterns in `src/components/ui`.