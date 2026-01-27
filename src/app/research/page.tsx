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
  dcf_value?: number;
  insider_sentiment?: string;
  latest_news?: { title: string, publishedDate: string, url: string, text: string }[];
  recent_insider_trades?: { filingDate: string, transactionType: string, securitiesTransacted: number, price: number, reportingName: string }[];
  [key: string]: string | number | undefined | unknown;
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
              if (Array.isArray(data)) {
                  setSignals(data)
              }
          } catch (err) {
              console.debug("Research Lab: Backend busy, skipping signals fetch...")
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
              if (p && !p.error) {
                  setProfile(p)
              }
              
              const h = await api.getPriceHistory(symbol, lookback)
              if (Array.isArray(h)) {
                  setPriceHistory(h)
              }
          } catch (err) {
              console.debug("Research Lab: Backend busy, skipping profile fetch...")
          }
      }
      loadSymbolData()
  }, [symbol, lookback])

      return (

        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-foreground font-sans overflow-hidden">

            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col p-4 gap-4">

                <div className="flex justify-between items-center px-2">

                    <div className="flex flex-col">

                        <h1 className="text-xl font-bold tracking-tight">Research Lab</h1>

                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Signals // Alpha Discovery</p>

                    </div>

                    <TabsList className="bg-muted/50 border border-border p-1">

                        <TabsTrigger value="signals" className="text-xs px-4 data-[state=active]:bg-background data-[state=active]:text-primary">Signal Charts</TabsTrigger>

                        <TabsTrigger value="governance" className="text-xs px-4 data-[state=active]:bg-background data-[state=active]:text-primary">Governance</TabsTrigger>

                    </TabsList>

                </div>

    

  

              <TabsContent value="signals" className="flex-1 min-h-0 m-0 outline-none">

                  <div className="flex flex-col gap-4 h-full">

                      {/* Control Center - SaaS Style */}

                      <SignalControlCenter 

                          symbol={symbol} 

                          setSymbol={setSymbol} 

                          lookback={lookback} 

                          setLookback={setLookback} 

                      />

  

                      {/* Main Grid - Balanced Layout */}

                      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">

                          

                          {/* Left Col: Charts (8 Units) */}

                          <div className="col-span-8 grid grid-rows-2 gap-4 h-full">

                              <div className="grid grid-cols-2 gap-4">

                                  <RankScatter data={signals} focusSymbol={symbol} />

                                  <PriceAnalysisChart data={priceHistory} symbol={symbol} lookback={lookback} />

                              </div>

                              <div className="grid grid-cols-2 gap-4">

                                   <FactorDistributionChart data={signals} />

                                   <RawRankingsTable data={signals} />

                              </div>

                          </div>

  

                          {/* Right Col: Profile (4 Units) */}

                          <div className="col-span-4 h-full overflow-hidden">

                              <CompanyProfile profile={profile} />

                          </div>

                      </div>

                  </div>

              </TabsContent>

  

              <TabsContent value="governance" className="flex-1 min-h-0 m-0 outline-none">

                  <StrategyGovernance />

              </TabsContent>

          </Tabs>

      </div>

    )

  }

  