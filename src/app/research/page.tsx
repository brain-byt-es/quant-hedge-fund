"use client"

import { useState, useEffect } from "react"
import { SignalControlCenter } from "@/components/research/signal-control-center"
import { RankScatter } from "@/components/research/rank-scatter"
import { PriceAnalysisChart } from "@/components/research/price-chart"
import { FactorDistributionChart } from "@/components/research/factor-distribution"
import { CompanyProfile } from "@/components/research/company-profile"
import { RawRankingsTable } from "@/components/research/raw-rankings-table"
import { StrategyGovernance } from "@/components/research/strategy-governance"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  [key: string]: unknown;
}

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState("signals")
  const [symbol, setSymbol] = useState("RGTI")
  const [lookback, setLookback] = useState(252)
  
  const [signals, setSignals] = useState<SignalData[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [priceHistory, setPriceHistory] = useState<{date: string, close: number, [key: string]: unknown}[]>([])

  // Fetch Signals (Rank vs Score)
  useEffect(() => {
      const loadSignals = async () => {
          try {
              const data = await api.getResearchSignals(lookback)
              setSignals(data)
          } catch (err) {
              console.error("Failed to load signals", err)
          }
      }
      loadSignals()
  }, [lookback])

  // Fetch Symbol Details
  useEffect(() => {
      if (!symbol) return
      const loadSymbolData = async () => {
          try {
              const p = await api.getCompanyProfile(symbol)
              setProfile(p)
              
              const h = await api.getPriceHistory(symbol, lookback)
              setPriceHistory(h)
          } catch (err) {
              console.error("Failed to load symbol data", err)
          }
      }
      loadSymbolData()
  }, [symbol, lookback])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-black text-zinc-300 font-sans p-2 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-2 px-2">
                <h1 className="text-sm font-bold tracking-tight text-zinc-100 uppercase">Research Lab</h1>
                <TabsList className="h-7 bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="signals" className="text-[10px] h-5 data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-500">Signal Charts</TabsTrigger>
                    <TabsTrigger value="governance" className="text-[10px] h-5 data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-500">Governance</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="signals" className="flex-1 min-h-0 space-y-2">
                
                {/* Control Center */}
                <div className="h-auto">
                    <SignalControlCenter 
                        symbol={symbol} 
                        setSymbol={setSymbol} 
                        lookback={lookback} 
                        setLookback={setLookback} 
                    />
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 h-full pb-2">
                    
                    {/* Left Col: Charts */}
                    <div className="col-span-8 grid grid-rows-2 gap-2 h-full">
                        <div className="grid grid-cols-2 gap-2 h-full">
                            <RankScatter data={signals} focusSymbol={symbol} />
                            <PriceAnalysisChart data={priceHistory} symbol={symbol} lookback={lookback} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 h-full">
                             <FactorDistributionChart data={signals} />
                             <RawRankingsTable data={signals} />
                        </div>
                    </div>

                    {/* Right Col: Profile */}
                    <div className="col-span-4 h-full">
                        <CompanyProfile profile={profile} />
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="governance" className="flex-1 min-h-0">
                <StrategyGovernance />
            </TabsContent>
        </Tabs>
    </div>
  )
}