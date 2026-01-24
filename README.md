# Quant Science Platform

> "Hedge Fund in a Box" — A professional-grade algorithmic trading dashboard.

## Overview

The **Quant Science Platform** is a unified ecosystem designed to bridge the gap between retail trading and institutional quantitative finance. It provides a cohesive interface for the entire algorithmic trading lifecycle:
1.  **Data Ingestion:** Managing vast datasets of price and fundamental data.
2.  **Strategy Research:** Developing and backtesting strategies using Python (Zipline).
3.  **Live Execution:** Automated order routing and portfolio management.

## Features

-   **Precision Industrial UI:** A dark-mode native interface optimized for long trading sessions and high data density.
-   **Central Dashboard:** Real-time view of P&L, Sharpe Ratio, and portfolio performance.
-   **Data Hub:** Monitor data pipelines and explore the asset universe.
-   **Research Lab:** Integrated environment for coding strategies and analyzing backtest results (Tear Sheets).
-   **Live Ops:** Real-time system console and manual order entry for intervention.

## Tech Stack

-   **Framework:** Next.js 14 (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS, CSS Variables
-   **UI Library:** shadcn/ui (Radix Primitives)
-   **Design:** Custom Material Design 3 implementation

## Getting Started

### Prerequisites

-   Node.js (v18+)
-   npm / yarn / pnpm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/brain-byt-es/quant-hedge-fund.git
    cd quant-hedge-fund
    ```

2.  **Frontend Setup:**
    ```bash
    npm install
    npm run dev
    ```

3.  **Backend Setup:**
    Open a new terminal.
    ```bash
    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --reload
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── dashboard/       # Main overview
│   ├── data/            # Data management
│   ├── research/        # Strategy IDE
│   └── live/            # Execution & Logs
├── components/          # React components
│   ├── dashboard/       # Dashboard-specific widgets
│   ├── layout/          # App shell (Sidebar, Header)
│   ├── ui/              # Shared UI primitives (Buttons, Inputs, etc.)
│   └── ...
└── lib/                 # Utilities and helpers
```

## License

[MIT](LICENSE)
