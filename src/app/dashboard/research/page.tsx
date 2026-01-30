"use client"

import { useState, useEffect } from "react"
import { SignalControlCenter } from "@/components/research/signal-control-center"
import { RankScatter } from "@/components/research/rank-scatter"
import { PriceAnalysisChart } from "@/components/research/price-chart"
import { FactorDistributionChart } from "@/components/research/factor-distribution"
import { CompanyProfile } from "@/components/research/company-profile"
import { MarketOverviewTable } from "@/components/research/market-overview-table"
import { api } from "@/lib/api"

interface SignalData {
  rank: number;
  symbol: string;
  factor_signal: number;
  as_of: string;
  bundle_name: string;
  [key: string]: unknown;
}

interface ProfileData {
  symbol: string;
  company_name: string;
  sector: string;
  industry: string;
  description: string;
  price: number;
  market_cap: number;
  full_time_employees: number;
  beta: number;
  ipo_date: string;
  exchange: string;
  website: string;
  dcf_value?: number;
  insider_sentiment?: string;
  latest_news?: { title: string, publishedDate: string, url: string, text: string }[];
  recent_insider_trades?: { filingDate: string, transactionType: string, securitiesTransacted: number, price: number, reportingName: string }[];
  [key: string]: string | number | undefined | unknown;
}

export default function ResearchPage() {
  const [symbol, setSymbol] = useState("")
  const [lookback, setLookback] = useState(252)
  
  const [signals, setSignals] = useState<SignalData[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [priceHistory, setPriceHistory] = useState<{date: string, close: number, [key: string]: unknown}[]>([])
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Fetch Signals (Rank vs Score)
  useEffect(() => {
      const loadSignals = async () => {
          try {
              const data = await api.getResearchSignals(lookback)
              if (Array.isArray(data)) {
                  setSignals(data)
                  // Auto-select first symbol if none chosen
                  if (data.length > 0 && !symbol) {
                      setSymbol(data[0].symbol)
                  }
              }
          } catch {
              console.debug("Research Lab: Backend busy, skipping signals fetch...")
          }
      }
      loadSignals()
  }, [lookback, symbol])

  // Fetch Symbol Details
  useEffect(() => {
      if (!symbol) return
      const loadSymbolData = async () => {
          setLoadingProfile(true)
          try {
              // Fetch profile and prices in parallel
              const [p, h] = await Promise.all([
                  api.getCompanyProfile(symbol),
                  api.getPriceHistory(symbol, lookback)
              ])

              if (p && !p.error) {
                  setProfile(p)
              }
              
              if (Array.isArray(h)) {
                  setPriceHistory(h)
              }
          } catch {
              console.debug("Research Lab: Backend busy or symbol missing, skipping profile fetch...")
          } finally {
              setLoadingProfile(false)
          }
      }
      loadSymbolData()
  }, [symbol, lookback])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-foreground font-sans overflow-hidden p-4 gap-4">
        <div className="flex justify-between items-center px-2 shrink-0">
            <div className="flex flex-col">
                <h1 className="text-2xl font-black tracking-tight italic">RESEARCH LAB</h1>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.3em] font-bold">Signals // Alpha Discovery</p>
            </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-4 h-full">
            {/* Control Center */}
            <div className="shrink-0">
                <SignalControlCenter 
                    symbol={symbol} 
                    setSymbol={setSymbol} 
                    lookback={lookback} 
                    setLookback={setLookback} 
                    allSymbols={signals.map(s => s.symbol)}
                />
            </div>

            {/* Main Layout */}
            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                {/* Left Column: Charts (Scrollable) */}
                <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Row 1: Analytics */}
                    <div className="h-[320px] shrink-0 grid grid-cols-2 gap-4">
                        <RankScatter data={signals} focusSymbol={symbol} />
                        <PriceAnalysisChart data={priceHistory} symbol={symbol} lookback={lookback} />
                    </div>
                    
                    {/* Row 2: Distribution (Compact) */}
                    <div className="h-[200px] shrink-0">
                         <FactorDistributionChart data={signals} />
                    </div>

                    {/* Row 3: Full Table */}
                    <div className="h-[600px] shrink-0 pb-4">
                         <MarketOverviewTable data={signals} />
                    </div>
                </div>

                {/* Right Column: Profile Sidebar (Fixed) */}
                <div className="w-[380px] shrink-0 h-full overflow-hidden">
                    <CompanyProfile profile={profile} isLoading={loadingProfile} />
                </div>
            </div>
        </div>
    </div>
  )
}

  