"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { Loader2, TrendingUp, ExternalLink, BarChart3, Newspaper, Info, Building2, Scale } from "lucide-react"
import { StockChart } from "@/components/research/stock-chart"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface Stock360Data {
  symbol: string
  quote: {
    price: number
    changesPercentage: number
    volume: number
    dayLow: number
    dayHigh: number
    yearLow: number
    yearHigh: number
    open: number
    previousClose: number
    [key: string]: string | number | boolean | null | undefined
  }
  trading: {
    day_low: number
    day_high: number
    year_low: number
    year_high: number
    open: number
    prev_close: number
    bid: number
    ask: number
  }
  profile: {
    companyName: string
    description: string
    ceo: string
    sector: string
    industry: string
    website: string
    fullTimeEmployees: string
    [key: string]: string | number | boolean | null | undefined
  }
  stats: {
    float: number
    market_cap: number
    volume_avg: number
    volume: number
    shares_outstanding: number
    pe_ratio: number
    eps: number
    beta: number
  }
  industry: {
    sector: string
    industry: string
    cik: string
    isin: string
    cusip: string
    exchange: string
  }
  catalysts: Array<{
    type: string
    title: string
    date: string
    url: string
    source: string
  }>
}

interface Stock360Props {
  symbol: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Stock360Sheet({ symbol, open, onOpenChange }: Stock360Props) {
  const [data, setData] = useState<Stock360Data | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    
    async function loadData() {
      if (!open || !symbol) return
      
      setLoading(true)
      try {
        const result = await api.getStock360(symbol)
        if (isMounted) {
          setData(result)
        }
      } catch (err) {
        console.error("Failed to load 360 data", err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()
    
    return () => { isMounted = false }
  }, [open, symbol])

  if (!symbol) return null

  const quote = data?.quote || { price: 0, changesPercentage: 0, volume: 0 }
  const trading = data?.trading || { day_low: 0, day_high: 0, year_low: 0, year_high: 0, open: 0, prev_close: 0, bid: 0, ask: 0 }
  const stats = data?.stats || { float: 0, market_cap: 0, volume_avg: 0, volume: 0, shares_outstanding: 0, pe_ratio: 0, eps: 0, beta: 0 }
  const profile = data?.profile || { companyName: "", description: "", ceo: "", sector: "", industry: "", website: "", fullTimeEmployees: "" }
  const industry = data?.industry || { sector: "", industry: "", cik: "", isin: "", cusip: "", exchange: "" }
  const isLowFloat = stats.float < 10000000

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[100%] sm:w-[600px] md:w-[700px] overflow-y-auto p-0 gap-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="flex flex-col h-full">
            {/* --- Hero Header --- */}
            <div className="p-6 border-b border-border bg-muted/10 sticky top-0 backdrop-blur-md z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black font-mono tracking-tighter flex items-center gap-2">
                    {symbol}
                    {isLowFloat && <Badge className="bg-orange-500 hover:bg-orange-600 text-[10px] uppercase">Low Float</Badge>}
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium">{profile.companyName}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="bg-muted px-1.5 py-0.5 rounded font-mono">{industry.exchange}</span>
                    <span className="font-mono">{industry.industry}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-mono font-bold text-foreground">
                    ${quote.price?.toFixed(2)}
                  </div>
                  <div className={`text-sm font-bold flex items-center justify-end gap-1 ${quote.changesPercentage >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {quote.changesPercentage >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingUp className="h-4 w-4 rotate-180" />}
                    {quote.changesPercentage?.toFixed(2)}%
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    Vol: {(quote.volume as number / 1000).toFixed(0)}k
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              
              {/* --- Chart Section --- */}
              <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Technical Structure (Daily)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 border rounded-xl bg-card/50 overflow-hidden h-[300px]">
                   <StockChart symbol={symbol} />
                </CardContent>
              </Card>

              {/* --- Details Accordion --- */}
              <Accordion type="multiple" defaultValue={["quote", "profile", "catalysts"]} className="w-full space-y-3">
                
                {/* 1. Detailed Quote */}
                <AccordionItem value="quote" className="border border-border/50 rounded-xl bg-background/20 px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-primary font-bold">
                        <span className="flex items-center gap-2"><Scale className="h-3 w-3" /> Detailed Quote</span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Float</span>
                                <div className={`text-sm font-mono font-bold ${isLowFloat ? "text-orange-500" : "text-foreground"}`}>
                                    {(stats.float / 1e6).toFixed(2)}M
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Market Cap</span>
                                <div className="text-sm font-mono font-bold">${(stats.market_cap / 1e6).toFixed(1)}M</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Beta</span>
                                <div className="text-sm font-mono font-bold">{stats.beta?.toFixed(2) || "-"}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">52W Range</span>
                                <div className="text-sm font-mono font-bold">${trading.year_low} - ${trading.year_high}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Prev Close</span>
                                <div className="text-sm font-mono font-bold">${trading.prev_close}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Open</span>
                                <div className="text-sm font-mono font-bold">${trading.open}</div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 2. Company Profile */}
                <AccordionItem value="profile" className="border border-border/50 rounded-xl bg-background/20 px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold">
                        <span className="flex items-center gap-2"><Building2 className="h-3 w-3" /> Company Profile</span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                            {profile.description}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="flex flex-col">
                                <span className="font-bold text-foreground">CEO</span>
                                <span className="text-muted-foreground">{profile.ceo || "N/A"}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-foreground">Employees</span>
                                <span className="text-muted-foreground">{profile.fullTimeEmployees || "N/A"}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-foreground">Sector</span>
                                <span className="text-muted-foreground">{industry.sector}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-foreground">Website</span>
                                <a href={profile.website} target="_blank" className="text-primary hover:underline truncate">{profile.website}</a>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 3. Industry Classifications */}
                <AccordionItem value="industry" className="border border-border/50 rounded-xl bg-background/20 px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold">
                        <span className="flex items-center gap-2"><Info className="h-3 w-3" /> Classifications</span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-card p-2 rounded border border-border/50">
                                <span className="text-[9px] text-muted-foreground block">CIK</span>
                                <span className="text-xs font-mono font-bold">{industry.cik || "-"}</span>
                            </div>
                            <div className="bg-card p-2 rounded border border-border/50">
                                <span className="text-[9px] text-muted-foreground block">ISIN</span>
                                <span className="text-xs font-mono font-bold">{industry.isin || "-"}</span>
                            </div>
                            <div className="bg-card p-2 rounded border border-border/50">
                                <span className="text-[9px] text-muted-foreground block">CUSIP</span>
                                <span className="text-xs font-mono font-bold">{industry.cusip || "-"}</span>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 4. Catalyst Feed */}
                <AccordionItem value="catalysts" className="border border-border/50 rounded-xl bg-background/20 px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold">
                        <span className="flex items-center gap-2"><Newspaper className="h-3 w-3" /> Catalyst Feed</span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                        <div className="space-y-2">
                          {data.catalysts?.map((item, i) => (
                            <a 
                              key={i} 
                              href={item.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="block p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-xs font-bold leading-tight group-hover:text-primary transition-colors">
                                  {item.title}
                                </span>
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </div>
                              <div className="flex justify-between mt-2">
                                <Badge variant={item.type === "INSIDER" ? "secondary" : "outline"} className="text-[9px] h-4 px-1 rounded-sm border-border/50 text-muted-foreground">
                                  {item.type}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                                </span>
                              </div>
                            </a>
                          ))}
                          {(!data.catalysts || data.catalysts.length === 0) && (
                              <div className="text-xs text-muted-foreground italic text-center py-4">No recent catalysts found.</div>
                          )}
                        </div>
                    </AccordionContent>
                </AccordionItem>

              </Accordion>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}