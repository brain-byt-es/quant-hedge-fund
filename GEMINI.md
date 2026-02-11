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
    - **FMP API Migration:** For all accounts created after August 2025, use the `/stable/` endpoints (e.g., `stable/income-statement?symbol=AAPL`) instead of the legacy `/api/v3/{symbol}` path.
- **Research Layer (QS Research):** Strategy development and backtesting.
    - **Zipline Reloaded:** Fully integrated backtesting engine.
    - **Project-Local Data:** Data is stored in `app/data/zipline` (controlled via `ZIPLINE_ROOT`) for absolute portability and VPS readiness.
    - **Factor Engine V2:** Powered by **FinanceToolkit**; provides 130+ professional ratios (Piotroski, Altman Z, etc.) with robust SimFin/FMP mapping.
    - **MLflow Integration:** Automated experiment tracking for every run (Sharpe, Alpha, Beta, Max Drawdown).
    - **Monte Carlo:** Statistical validation of strategy significance (P-Value check).
- **Execution Layer (Omega):** Multi-Broker Adapter Pattern.
    - **Adapters:** Native support for **Alpaca** (Paper/Live) and **Interactive Brokers** (Institutional).
    - **Risk Engine:** Real-time **VaR (95%)** and **Expected Shortfall** calculations.
    - **Headless Control:** API-driven Emergency HALT/RESUME and Broker Switching.
- **AI Insights:** Market regime detection and strategy generation powered by **OpenAI (GPT-4o)** with **Groq (Llama 3)** fallback.
- **Global Search Index:** Unified Master Asset Index powered by **JerBouma's FinanceDatabase**.
    - **Coverage:** 350k+ symbols across Equities, ETFs, Crypto, Indices, Currencies, and Funds.
    - **Fast Lookup:** Sub-millisecond async search via `/api/search/global`.

### 2. Executive Dashboard (Next.js 14+ / TypeScript)
Exposed on `localhost:3000`. The central "Mission Control":
- **Dashboard:** High-density KPI scoreboard (Total Equity, Daily P&L Live Flash, Risk Metrics).
- **AI Quant Team:** 4-Quadrant module (Architect Chat, Hypothesis Forge, Code Injector, Config Core) for LLM-powered alpha discovery.
    - **Mission Control:** Features a **Data Bundle Selector** to switch between `momentum_test_bundle` (Fast) and `historical_prices_fmp` (Global).
- **Market Hub:** Comprehensive "Stocknear-style" taxonomy.
    - **Sectors & Industries:** Grouped hierarchical view (Overview | Sectors | Industries).
    - **Global Filter:** Pro-grade Combobox filtering by Country, Exchange, and Category.
- **Research Lab:** Integrated Backtest history (MLflow REST API) and **Strategy Governance**.
- **Data Hub:** Real-time data health monitor and manual ingestion orchestration.

### 3. Strategy Lab (MLflow)
Exposed on `localhost:5000`. Tracks every strategy iteration and performance metric.

### 4. Automation Layer (Prefect)
Exposed on `localhost:4200`. Orchestrates nightly data flows and automated backtests.

## Infrastructure & Workflows

### 1. Service Orchestration
Managed via `start.sh`. Features **Aggressive Pre-flight Cleanup**:
- Force-kills processes on ports 8000, 3000, 5000, 4200.
- Releases lingering DuckDB file locks via `lsof` and clears lingering WAL files.
- Launches FastAPI, MLflow, Prefect, and Next.js in parallel.

### 2. Data Flow
1. **Ingest Assets:** FinanceDatabase Sync -> master_assets_index (DuckDB).
2. **Enrich:** API Requests -> master_assets_index + JIT FMP Quotes.
3. **Backtest:** AI Quant Team -> FastAPI -> `run_backtest.py` -> Zipline -> MLflow.
4. **Approve:** Governance Tab -> Human Rationale -> Immutable Audit Trail (DuckDB).
5. **Trade:** Omega Singleton -> Risk Engine -> Broker Adapter -> Live Market.

## Design Principles
- **Aesthetic:** "Precision Industrial" (Deep Black `#09090b`, Glassmorphism, High-Density).
- **Typography:** `Inter` for UI, `JetBrains Mono` for all financial data and code.
- **Headless:** The frontend is a pure observer; all logic and script execution is controlled via the API bridge.

## Development Guidelines for AI Agents
- **DB Concurrency:** NEVER open a direct connection to `quant.duckdb` from new scripts; always go through `api.routers.data.get_qs_client()` to use the shared manager.
- **Zipline Root:** ALWAYS use `ZIPLINE_ROOT` pointing to `data/zipline` in the project root. Never use `~/.zipline`.
- **Environment Patch:** The project uses a patched version of `FinanceToolkit` (in `venv`) to fix Pandas 2.3 `DatetimeIndex.asfreq` compatibility.
- **Type Safety:** All numeric financial data must be cast to `Float64` before DB insertion.

### **Developer Experience (DX) / Troubleshooting**
- **Zipline 404 Fix:** If a bundle is not found, ensure the `ZIPLINE_ROOT` environment variable is set to the absolute path of `app/data/zipline`.
- **Ratio Calculation Failure:** `FinanceToolkit` requires transposed financial statements (Metrics as Rows, Dates as Columns). Ensure `FactorEngine.get_detailed_metrics` maintains this flow.
- **DuckDB Lock Fix:** If `IO Error: Could not set lock`, find and kill the lingering Python process via `lsof data/quant.duckdb`.\n## **Future Enhancements / TODO**\n- [ ] **Ticker Mismatch Checker & Mapper:** Implement a fuzzy-matching logic to bridge ticker differences between SimFin (e.g., BRK.B), FMP (e.g., BRK-B), and Yahoo Finance. This will resolve the 'Missing Prices' issue for ~400 symbols.\n- [ ] **SQL Data Explorer:** Add a raw SQL console in the Data Hub for manual integrity checks.\n- [ ] **Risk Engine V2:** Fully implement Live VaR (95%) and Net Exposure tracking in the new Risk Control dashboard.
\n## **Latest Milestone Summary (February 11, 2026)**\n- **SimFin Anchor Strategy:** Successfully restructured ingestion to focus on a curated 5,000+ symbol universe. Solved the 350k asset bottleneck and optimized API usage.\n- **Institutional Strategy Lab:** Launched an engineering-first workbench with manual code injection, dual-pane editing, and live MLflow integration.\n- **Pro Stock Screener:** Deployed a high-speed scanner with 'Warrior Trading' presets (RVol, Gap%) powered by DuckDB and Polars.\n- **Data Integrity:** Identified Zipline ingestion blocker (AssertionError due to missing trading sessions) after successful 2.3M record download. Added to TODO for fix.\n- **UX/UI:** Integrated in-app documentation hub, hover tooltips, and consolidated strategy governance into the Lab workflow.
\n- [ ] **CIK-Mapping Integration (HIGH PRIORITY): Implement "Smart Stitching" logic (SimFin History + FMP Recent) using** Refactor QSConnect to use SEC CIK as the primary entity identifier. This will merge SimFin and FMP data for assets with mismatched tickers (e.g., BRK.B vs BRK-B) and eliminate redundant API calls.
