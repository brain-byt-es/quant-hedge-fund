"use client"

import { useState, useEffect, useCallback } from "react"
import { SignalControlCenter } from "@/components/research/signal-control-center"
import { RankScatter } from "@/components/research/rank-scatter"
import { PriceAnalysisChart } from "@/components/research/price-chart"
import { FactorDistributionChart } from "@/components/research/factor-distribution"
import { CompanyProfile } from "@/components/research/company-profile"
import { MarketOverviewTable } from "@/components/research/market-overview-table"
import { BacktestHistoryTable } from "@/components/research/backtest-history-table"
import { PortfolioAttribution } from "@/components/research/portfolio-attribution"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Activity, Target, History, BarChart3 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface SignalData {
  rank: number;
  symbol: string;
  price?: number;
  change_percent?: number;
  market_cap?: number;
  volume?: number;
  momentum?: number;
  f_score?: number;
  as_of: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface BacktestRun {
  run_id: string
  strategy_name: string
  start_time: string
  status: string
  sharpe_ratio: number
  annual_return: number
  max_drawdown: number
  volatility: number
  tags: Record<string, string>
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

interface AttributionData {
    strategy_hash: string
    name: string
    equity: number
    allocation: number
    total_pnl: number
    return_pct: number
    sharpe: number
    history: { timestamp: string, equity: number }[]
}

export default function ResearchPage() {
  const [symbol, setSymbol] = useState("")
  const [lookback, setLookback] = useState(252)
  const [minMCap, setMinMCap] = useState(500) // Millions
  const [minVolume, setMinVolume] = useState(1) // Millions
  const [isUpdating, setIsUpdating] = useState(false)
  
  const [signals, setSignals] = useState<SignalData[]>([])
  const [backtests, setBacktests] = useState<BacktestRun[]>([])
  const [attribution, setAttribution] = useState<AttributionData[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [priceHistory, setPriceHistory] = useState<{date: string, close: number, [key: string]: unknown}[]>([])
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Fetch Signals, Backtests & Attribution
  const loadData = useCallback(async () => {
      try {
          const [sigData, runData, attrData] = await Promise.all([
              api.getResearchSignals(lookback, minMCap, minVolume),
              api.listBacktests(50),
              api.getPortfolioAttribution()
          ])
          
          if (Array.isArray(sigData)) {
              setSignals(sigData)
              if (sigData.length > 0 && !symbol) setSymbol(sigData[0].symbol)
          }
          if (Array.isArray(runData)) {
              setBacktests(runData as unknown as BacktestRun[])
          }
          if (Array.isArray(attrData)) {
              setAttribution(attrData)
          }
      } catch {
          console.debug("Research Lab: Backend busy...")
      }
  }, [lookback, minMCap, minVolume, symbol])

  useEffect(() => {
      loadData()
  }, [loadData]) 

  const handleUpdateUniverse = async () => {
      setIsUpdating(true)
      try {
          const res = await api.triggerFactorUpdate(minMCap * 1000000, minVolume * 1000000)
          toast.success("Universe Updated", {
              description: `Ranked ${res.ranked_symbols} symbols with new institutional filters.`
          })
          await loadData()
      } catch (err) {
          toast.error("Update Failed", { description: String(err) })
      } finally {
          setIsUpdating(false)
      }
  }

  // Fetch Symbol Details
  useEffect(() => {
      if (!symbol) return
      const loadSymbolData = async () => {
          setLoadingProfile(true)
          try {
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
              console.debug("Research Lab: Backend busy skip profile...")
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
                    minMCap={minMCap}
                    setMinMCap={setMinMCap}
                    minVolume={minVolume}
                    setMinVolume={setMinVolume}
                    onUpdateUniverse={handleUpdateUniverse}
                    isUpdating={isUpdating}
                    allSymbols={signals.map(s => s.symbol)}
                />
            </div>

            {/* Main Layout */}
            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                {/* Left Column: Analytics with Tabs */}
                <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
                    <Tabs defaultValue="universe" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="bg-muted/20 border border-border/50 p-1 self-start mb-2 shrink-0">
                            <TabsTrigger value="universe" className="text-[10px] uppercase font-bold px-4 gap-2">
                                <Activity className="w-3 h-3" /> Market Universe
                            </TabsTrigger>
                            <TabsTrigger value="attribution" className="text-[10px] uppercase font-bold px-4 gap-2">
                                <Target className="w-3 h-3 text-primary" /> Strategy Attribution
                            </TabsTrigger>
                            <TabsTrigger value="history" className="text-[10px] uppercase font-bold px-4 gap-2">
                                <History className="w-3 h-3" /> Backtest Audit
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="universe" className="flex-1 min-h-0 m-0 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="h-[320px] shrink-0 grid grid-cols-2 gap-4">
                                <RankScatter data={signals} focusSymbol={symbol} />
                                <PriceAnalysisChart data={priceHistory} symbol={symbol} lookback={lookback} />
                            </div>
                            <div className="h-[200px] shrink-0">
                                <FactorDistributionChart data={signals} />
                            </div>
                            <div className="flex-1 min-h-[500px] pb-4">
                                <div className="h-full flex flex-col border border-border/50 rounded-xl overflow-hidden shadow-xl bg-card/20 backdrop-blur-md">
                                    <div className="py-2 px-3 border-b border-border/50 flex items-center justify-between bg-card/40">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <BarChart3 className="h-3 w-3" /> Factor Intelligence Universe
                                        </h3>
                                        <Badge variant="outline" className="text-[9px] h-4 bg-background/50">{signals.length} Active Signals</Badge>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <MarketOverviewTable data={signals} onSelectSymbol={setSymbol} />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="attribution" className="flex-1 min-h-0 m-0 overflow-y-auto pr-2 custom-scrollbar">
                            <PortfolioAttribution data={attribution} />
                        </TabsContent>

                        <TabsContent value="history" className="flex-1 min-h-0 m-0 overflow-hidden">
                            <BacktestHistoryTable data={backtests} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column: Profile Sidebar */}
                <div className="w-[380px] shrink-0 h-full overflow-hidden">
                    <CompanyProfile profile={profile} isLoading={loadingProfile} />
                </div>
            </div>
        </div>
    </div>
  )
}
