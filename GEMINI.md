# Quant Hedge Fund System (Integrated Platform)

## Project Context
This project is a professional-grade quantitative trading platform. It integrates a high-performance Python backend (QS Monolith) with a modern Next.js 14/15 frontend, featuring an AI-augmented research lab and institutional-grade execution controls.

## Unified Architecture

### 1. Backend (Python 3.13)
Located in `/backend`, providing core logic via a modular **FastAPI** monorepo:
- **Data Layer (QS Connect):** High-throughput ingestion into **DuckDB** (OLAP).
    - **Institutional Scalability:** `volume` and price columns use `DOUBLE` precision to handle 40k+ symbols and massive crypto/aggregate data volumes.
    - **Reliability:** Implements **Smart Resume** and **Incremental Saving** (every 200 symbols) to prevent data loss during interruptions.
    - **Stability:** Centralized DB access via shared client to prevent write-lock conflicts.
- **Research Layer (QS Research):** Strategy development and backtesting.
    - **MLflow Integration:** Automated experiment tracking for every run (Sharpe, Alpha, Beta, Max Drawdown).
    - **Monte Carlo:** Statistical validation of strategy significance (P-Value check).
- **Execution Layer (Omega):** Multi-Broker Adapter Pattern.
    - **Adapters:** Native support for **Alpaca** (Paper/Live) and **Interactive Brokers** (Institutional).
    - **Risk Engine:** Real-time **VaR (95%)** and **Expected Shortfall** calculations.
    - **Headless Control:** API-driven Emergency HALT/RESUME and Broker Switching.
- **AI Insights:** Market regime detection and strategy generation powered by **OpenAI (GPT-4o)** with **Groq (Llama 3)** fallback.

### 2. Executive Dashboard (Next.js 14+ / TypeScript)
Exposed on `localhost:3000`. The central "Mission Control":
- **Dashboard:** High-density KPI scoreboard (Total Equity, Daily P&L Live Flash, Risk Metrics).
- **Live Ops:** Professional "Mission Control" with Equity/Drawdown charts, Active Weights table with **Trend Sparklines**, and real-time order blotter.
- **AI Quant Team:** 4-Quadrant module (Architect Chat, Hypothesis Forge, Code Injector, Config Core) for LLM-powered alpha discovery.
- **Research Lab:** Integrated Backtest history (MLflow REST API) and **Strategy Governance** (Human-in-the-loop approvals and audit trails).
- **Data Hub:** Real-time data health monitor (Gaps/Stale detection) and manual ingestion orchestration.

### 3. Strategy Lab (MLflow)
Exposed on `localhost:5000`. Serves as the "Hedge Fund Archive":
- Tracks every strategy iteration, parameter set, and performance metric.
- Stores artifacts (plots, pkl files) for long-term auditability.

### 4. Automation Layer (Prefect)
Exposed on `localhost:4200`. The "System Janitor":
- Orchestrates nightly data flows and automated backtests.
- Manages retry logic and error reporting for long-running batch jobs.

## Core Tech Stack
- **Frontend:** Next.js (App Router), Recharts, Shadcn/UI, Tailwind CSS.
- **Backend API:** FastAPI (Modular Routers), Uvicorn (Single-worker for DB safety).
- **Database:** DuckDB (Primary OLAP) + Parquet (Caching).
- **Execution:** `ib-insync`, `alpaca-trade-api` (Adapter Pattern).
- **AI:** OpenAI (GPT-4o), Groq (Llama 3.3-70b).
- **Orchestration:** Prefect 3.0, MLflow 3.8.

## Infrastructure & Workflows

### 1. Service Orchestration
Managed via `start.sh`. Features **Aggressive Pre-flight Cleanup**:
- Force-kills processes on ports 8000, 3000, 5000, 4200.
- Releases lingering DuckDB file locks via `lsof` before startup.
- Launches FastAPI, MLflow, Prefect, and Next.js in parallel.

### 2. Data Flow
1. **Ingest:** Dashboard -> FastAPI -> QS Connect -> FMP Stable API -> DuckDB (Incremental).
2. **Backtest:** Research Lab -> FastAPI -> Zipline -> MLflow (Experiment Tracking).
3. **Approve:** Governance Tab -> Human Rationale -> Immutable Audit Trail (DuckDB).
4. **Trade:** Omega Singleton -> Risk Engine -> Broker Adapter -> Live Market.

## Design Principles
- **Aesthetic:** "Precision Industrial" (Deep Black `#09090b`, Glassmorphism, High-Density).
- **Typography:** `Inter` for UI, `JetBrains Mono` for all financial data and code.
- **Safety:** Explicit Human-in-the-loop for AI-generated code; Backend-enforced risk circuit breakers.
- **Headless:** The frontend is a pure observer; all logic and script execution is controlled via the API bridge.

## Development Guidelines for AI Agents
- **DB Concurrency:** NEVER open a direct connection to `quant.duckdb` from new scripts; always go through `api.routers.data.get_qs_client()` to use the shared manager.
- **Type Safety:** All numeric financial data must be cast to `Float64` before DB insertion to prevent C-level overflow errors.
- **AI Provider:** Update `backend/omega/ai_service.py` if switching primary LLM providers.
