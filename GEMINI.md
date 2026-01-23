# Quant Science "Hedge Fund in a Box" Platform

## Project Context
This project is a commercial-grade algorithmic trading dashboard designed to democratize institutional quantitative finance. It serves as a "cockpit" for retail traders and data scientists to ingest data, research strategies (backtesting), and execute live trades.

## Core Design Principles (Strict Adherence Required)

### 1. Aesthetic: "Precision Industrial"
- **Theme:** Dark Mode native.
- **Surface:** Deep Gunmetal (`#121212` - `#1E1E1E`).
- **Primary Accent:** Cyan (`#00E5FF`) for "Science" and high-priority actions.
- **Typography:**
    - UI Elements: `Roboto Flex`
    - Data/Code: `JetBrains Mono` (CRITICAL for financial tables and logs)

### 2. Framework & Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript.
- **Styling:** Tailwind CSS + shadcn/ui.
- **Icons:** Lucide React (or Material Symbols if strictly required).
- **State:** React Server Components where possible; Client Components for interactive dashboards.

### 3. File Structure Conventions
- **Pages:** `src/app/[feature]/page.tsx`
- **Components:** `src/components/[feature]/[component].tsx`
    - `dashboard/`: KPI cards, main charts.
    - `data/`: Ingestion status, asset tables.
    - `research/`: Strategy forms, code editors, backtest results.
    - `live/`: Order tickets, console logs.
    - `layout/`: App shell, sidebar.
- **UI Primitives:** `src/components/ui/` (shadcn/ui components).

## Development Guidelines for AI Agents

1.  **Design Tokens:** Always use the CSS variables defined in `src/app/globals.css` (e.g., `var(--background)`, `var(--primary)`) or their Tailwind equivalents (e.g., `bg-background`, `text-primary`). Do not hardcode hex values unless defining a new semantic token.
2.  **Responsiveness:** Design for high-density desktop displays first (trader workstations), but ensure fluid degradation to tablet sizes. Use `lg:col-span-x` grid patterns.
3.  **Data Density:** Prefer compact tables and lists. Use `font-mono` for all numeric financial data to ensure alignment.
4.  **Component Reusability:** If a component is used in more than one place (e.g., a specific card style), refactor it to `src/components/shared/` or `src/components/ui/`.
5.  **No Mocking Libraries:** For prototype data, use simple in-file arrays or constants. Do not introduce complex mocking libraries unless requested.

## Current Features
- **Dashboard:** P&L visualization, Key Performance Indicators.
- **Data Hub:** ETL process monitoring, Asset Universe table.
- **Research Lab:** Python-like strategy editor (mock), Backtest tear sheets.
- **Live Ops:** Real-time system logs, Order execution ticket.
