# Quant Hedge Fund System (Integrated Platform)

## Project Context
This project is a professional-grade quantitative trading platform. It integrates a high-performance Python backend (QS Connect, QS Research, Omega) with a modern Next.js 14 frontend and a Streamlit operational control plane.

## Unified Architecture

### 1. Backend (Python 3.13)
Located in `/backend`, providing the core logic via a modular **FastAPI** bridge:
- **Data Layer (QS Connect):** Ingests market/fundamental data from FMP/Datalink into **DuckDB** and Parquet caches.
    - **Point-in-Time:** Implements "Index Constituents" tracking to eliminate survivorship bias.
    - **Data Integrity:** Automated gap and spike detection during ingestion.
- **Research Layer (QS Research):** Strategy development and backtesting using **Zipline-Reloaded** and **MLflow** for experiment tracking.
    - **Monte Carlo:** Statistical validation of strategy performance.
- **Execution Layer (Omega):** Multi-Broker Adapter System supporting:
    - **Alpaca:** Paper/Live trading (Default for development).
    - **Interactive Brokers (IBKR):** Institutional execution (Live).
    - **Risk Engine:** Real-time VaR, Expected Shortfall, and Circuit Breakers.
- **API Bridge:** Modular FastAPI routers (`/api/data`, `/api/live`, `/api/backtest`) with **WebSocket** support for real-time dashboard updates.
- **AI Insights:** Market analysis and regime detection powered by **Groq**.

### 2. Executive Dashboard (Next.js 14 / TypeScript)
Exposed on `localhost:3000`. Serves as the central "Mission Control":
- **High-level KPI Monitoring:** Total P&L, Alpha, Sharpe, VaR (Live).
- **Strategy Lab:** Backtest triggers and MLflow history integration.
- **AI Quant Team:** LLM-powered strategy generation and automated performance analysis.
- **Data Hub:** Real-time data health monitoring and manual ingestion controls.
- **Admin Controls:** Emergency HALT/RESUME and broker switching (Alpaca/IBKR).
- Modern, high-density UI using `shadcn/ui` and `Tailwind CSS`.

### 3. Strategy Lab (MLflow)
Exposed on `localhost:5000`. Handles experiment tracking:
- Automated logging of every backtest run.
- Artifact storage for performance charts and parameter snapshots.
- Comparison engine for strategy versions.

### 4. Automation Layer (Prefect)
Exposed on `localhost:4200`. The system "Janitor":
- Orchestrates nightly data ingestion flows.
- Manages recovery and retries for long-running data tasks.

## Core Tech Stack
- **Frontend:** Next.js (App Router), Lucide Icons, Shadcn/UI, Tailwind.
- **Backend API:** FastAPI (Modular Routers), Uvicorn, WebSockets.
- **Database:** DuckDB (OLAP) + Parquet (Caching).
- **Execution:** `ib-insync`, `alpaca-trade-api` (Adapter Pattern).
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
- `.env` in root handles platform-wide settings (Broker keys, API URLs).
- `backend/config/settings.py` centralized configuration loading.

### 3. Data Flow
1. **Ingest:** Frontend/API -> QS Connect -> DuckDB (Write Lock).
2. **Read:** Frontend -> API (Read-Only Connection) -> DuckDB.
3. **Backtest:** Research Lab -> Zipline -> Metrics -> MLflow.
4. **Trade:** Omega (Singleton) -> Broker Adapter (Alpaca/IBKR) -> Live Market.

## Design Principles
- **Aesthetic:** "Precision Industrial" (Dark Mode, Gunmetal/Cyan).
- **Typography:** `JetBrains Mono` for all financial figures (CRITICAL).
- **Security:** Backend-enforced risk limits and manual emergency halt.
- **Robustness:** Singleton pattern for TradingApp to prevent race conditions; Event loop patching for IBKR compatibility.

## Development Guidelines for AI Agents
- **Backend Modifications:** Ensure any new logic in `backend/` is exposed via `backend/api/routers/` if it needs to be consumed by the React frontend.
- **Database:** Use `DuckDBManager` for all SQL operations to ensure connection pooling and safety.
- **Styles:** Stick to `shadcn/ui` patterns in `src/components/ui`.