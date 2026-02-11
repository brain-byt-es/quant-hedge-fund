# 🌐 Global Filings & Regulatory Reference

This document serves as a technical reference for expanding the Quant Hedge Fund's tracking capabilities beyond the US 13F system.

---

## 1. Overview: The US 13F vs. The World

The US **SEC Form 13F** is unique because it is **Fund-Centric**: it lists every position owned by a manager over $100M. 

Most other global markets are **Stock-Centric**: they only disclose when an owner crosses a specific ownership percentage (Threshold) of a single company.

---

## 2. Regional Equivalents (Pondons)

### 🇪🇺 Europe (EU & UK)
**Regulatory Framework:** *Transparency Directive & MiFID II*

*   **Long Positions (Threshold Reporting):** 
    *   **Form:** TR-1 (Standard Form for Notification of Major Holdings).
    *   **Threshold:** Usually starts at **3%** (UK) or **5%** (most of EU).
    *   **Frequency:** Within 2–4 trading days of crossing the threshold.
*   **Short Positions (Public Disclosure):**
    *   **Rule:** EU Regulation No 236/2012.
    *   **Threshold:** Public disclosure required for net short positions exceeding **0.5%** of issued share capital.
    *   **Alpha Signal:** High conviction "Short Interest" is much more transparent in Europe than the US.

### 🇯🇵 Japan
**Regulatory Framework:** *Financial Instruments and Exchange Act*

*   **"The 5% Rule" (Large Shareholding Report):**
    *   Investors must report to the FSA within 5 business days of crossing 5%.
    *   Any change of **1%** (increase or decrease) requires an amendment within 5 days.

### 🇨🇳 China
**Regulatory Framework:** *CSRC Guidelines*

*   **Mutual Funds:** Full portfolio disclosure required **Quarterly** (very similar to 13F).
*   **Hedge Funds (Private):** Opaque. Only "Major Shareholders" (>5%) are disclosed in the company's annual/quarterly reports.

### 🇭🇰 Hong Kong
**Regulatory Framework:** *Securities and Futures Ordinance (SFO)*

*   **Disclosure of Interests (DI):** 
    *   **Long Threshold:** 5%.
    *   **Short Threshold:** 1%.
    *   **Timing:** Within 3 business days.

### 🇿🇦 South Africa
**Regulatory Framework:** *JSE Listing Requirements*

*   **SENS (Stock Exchange News Service):** 
    *   Major changes in beneficial ownership (crossing **5%** increments) must be published immediately via SENS.

---

## 🛠️ Data Architecture Recommendations

When integrating these into the `QSConnect` engine, the query logic must flip depending on the region:

### US Data (13F)
*   **Logic:** Query by **Fund ID (CIK)**.
*   **FMP Endpoint:** `/api/v3/institutional-holdings/portfolio-holding?cik=...`
*   **Mapping:** One Fund -> Many Stocks.

### International Data (Global)
*   **Logic:** Query by **Asset Symbol**.
*   **FMP Endpoint:** `/api/v3/historical/major_holders/SYMBOL`
*   **Mapping:** One Stock -> Many Owners.

---
*Reference created: February 10, 2026*
