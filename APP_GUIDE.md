# 🦅 QuantHedgeFond - User Guide

Welcome to your institutional-grade quantitative trading platform. This guide explains how to manage your data and use the core features effectively.

---

## 🏗️ The "Active Universe" Strategy (SimFin Anchor)

To save you from API limits and data bloat, the system uses a **SimFin-First** approach.

1.  **The Anchor:** We use the **SimFin 5000+** (curated US stocks that actually file reports) as our master list.
2.  **The Enrichment:** We use **FMP** to fill the gaps (real-time prices, latest filings) for only those 5,000 stocks.
3.  **The Benefit:** You get a professional universe without the 350,000 "junk" assets or expensive API bills.

---

## ⚡ Data Ingestion Routine

Located in **Dashboard > Data Hub**.

### 1. SimFin Bulk Ingest (Weekly/Setup)
*   **When:** Run once during setup, or once a week.
*   **What:** Downloads the master list of companies and 10+ years of historical fundamentals.
*   **Note:** This defines which stocks the system "cares about."

### 2. Full Backfill (Monthly/Gap-Fill)
*   **When:** Run once a month or if you have data gaps.
*   **What:** Fetches **2 Years of Historical Prices** from FMP for the SimFin universe.
*   **Logic:** It specifically fills the 1-year gap in the SimFin Free plan and adds another year for technical indicator stability.

### 3. Daily Sync (Every Morning)
*   **When:** Every day before the market opens.
*   **What:** Fetches **Yesterday's Close** and any **New Filings** released in the last 24 hours.
*   **Speed:** Very fast (~1-2 minutes).

### 🧠 Intelligence Core: Why Ingestion is Fast

The ingestion engine isn't just a simple downloader; it has built-in IQ to save your API credits and time:

*   **Smart Resume:** The system scans your database before every run. If it sees that a stock already has fresh data, it skips it entirely. It only fetches what is missing.
*   **Negative Caching:** If an API call for a stock returns "No Data" (e.g., for a new IPO or private company), the system blacklists that symbol for 30 days. This prevents the engine from wasting time rescanning "dead" symbols every day.
*   **Batch Commits:** Data is saved in batches of 500. If your computer crashes or you stop the process, 95% of your progress is already safe in the database.

---

## 🔍 Pro Stock Screener

Located in **Dashboard > Stock Screener**.

Features professional daytrading metrics inspired by **Warrior Trading**:
*   **Rel Vol (Relative Volume):** How much more volume is trading today vs. the 30-day average. 2.0x or higher is high momentum.
*   **Gap %:** The difference between today's open and yesterday's close.
*   **Presets:** Use "Gap & Go" or "Small Cap Runners" to instantly find volatility.

---

## 🛠️ Developer Tips
*   **Database:** Located at `data/quant.duckdb`. It's a single file you can copy anywhere.
*   **Zipline:** Data is stored in `data/zipline` (portable).
*   **Reset:** To start fresh, stop the backend and delete the `quant.duckdb` file.

---
*Happy Trading!*