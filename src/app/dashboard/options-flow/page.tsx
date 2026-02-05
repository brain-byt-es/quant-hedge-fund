"use client"

import { useState, useEffect } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { SentimentBar } from "@/components/market-hub/sentiment-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tornado, Zap, Filter, Search, Download, Target, History } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface OptionTrade {
  symbol: string
  ticker: string
  price: number
  strike: number
  expiry: string
  type: "Call" | "Put"
  side: "Buy" | "Sell"
  size: number
  premium: number
  sentiment: "Bullish" | "Bearish" | "Neutral"
  activity: "Sweep" | "Block" | "Trade"
  time: string
}

export default function OptionsFlowPage() {
  const [trades, setTrades] = useState<OptionTrade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock Data mimicking Stocknear Options Flow
    const mockTrades: OptionTrade[] = [
      { ticker: "NVDA", symbol: "NVDA", price: 145.20, strike: 150, expiry: "2026-03-20", type: "Call", side: "Buy", size: 1250, premium: 450000, sentiment: "Bullish", activity: "Sweep", time: "14:32:10" },
      { ticker: "AAPL", symbol: "AAPL", price: 232.10, strike: 220, expiry: "2026-02-20", type: "Put", side: "Buy", size: 800, premium: 125000, sentiment: "Bearish", activity: "Block", time: "14:31:05" },
      { ticker: "TSLA", symbol: "TSLA", price: 185.50, strike: 200, expiry: "2026-06-19", type: "Call", side: "Buy", size: 2500, premium: 890000, sentiment: "Bullish", activity: "Sweep", time: "14:30:45" },
      { ticker: "MSFT", symbol: "MSFT", price: 410.12, strike: 400, expiry: "2026-02-20", type: "Put", side: "Sell", size: 500, premium: 65000, sentiment: "Neutral", activity: "Trade", time: "14:29:12" },
      { ticker: "AMD", symbol: "AMD", price: 162.30, strike: 175, expiry: "2026-03-20", type: "Call", side: "Buy", size: 3000, premium: 520000, sentiment: "Bullish", activity: "Sweep", time: "14:28:55" },
    ]
    
    const timer = setTimeout(() => {
        setTrades(mockTrades)
        setLoading(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const formatPremium = (val: number) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`
    return `$${val}`
  }

  const columns = [
    { header: "Time", accessorKey: "time", className: "w-[80px] opacity-50 font-mono text-[10px]" },
    { header: "Ticker", accessorKey: "ticker", className: "w-[80px]" },
    { 
        header: "Type", 
        accessorKey: "type",
        cell: (item: OptionTrade) => (
            <span className={cn(
                "font-black text-[10px] uppercase",
                item.type === "Call" ? "text-green-500" : "text-red-500"
            )}>
                {item.type}
            </span>
        )
    },
    { header: "Strike", accessorKey: "strike", cell: (item: OptionTrade) => <span className="font-mono font-bold">${item.strike}</span> },
    { header: "Expiry", accessorKey: "expiry", cell: (item: OptionTrade) => <span className="font-mono opacity-70">{item.expiry}</span> },
    { 
        header: "Activity", 
        accessorKey: "activity",
        cell: (item: OptionTrade) => (
            <Badge variant="outline" className={cn(
                "h-4 text-[8px] font-black uppercase tracking-tighter px-1",
                item.activity === "Sweep" ? "bg-violet-500/10 text-violet-500 border-violet-500/20" : "bg-muted text-muted-foreground"
            )}>
                {item.activity}
            </Badge>
        )
    },
    { header: "Size", accessorKey: "size", cell: (item: OptionTrade) => <span className="font-mono">{item.size.toLocaleString()}</span> },
    { header: "Premium", accessorKey: "premium", cell: (item: OptionTrade) => <span className="font-black text-primary">{formatPremium(item.premium)}</span> },
    { 
        header: "Execution", 
        accessorKey: "ticker", 
        cell: () => (
            <Button size="icon" variant="ghost" className="h-6 w-6 text-violet-500 hover:bg-violet-500/10">
                <Target className="h-3.5 w-3.5" />
            </Button>
        )
    },
  ]

  return (
    <div className="flex flex-col h-full space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter italic uppercase flex items-center gap-2">
            <Tornado className="h-6 w-6 text-violet-500" /> Options Flow
          </h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1 text-violet-500/70">
            Real-time Institutional Option Sweeps & Blocks
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest bg-card/40">
                <History className="h-3 w-3 mr-2" /> Historical
            </Button>
            <Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                <Zap className="h-3 w-3 mr-2 fill-current" /> Live Feed
            </Button>
        </div>
      </div>

      <div className="bg-card/30 border border-border/50 rounded-2xl p-6">
        <SentimentBar 
            bullish={68} 
            bearish={32} 
            bullishPremium="$4.2M" 
            bearishPremium="$1.8M" 
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
            <Input 
                placeholder="Filter flow (e.g. TSLA, >100K Premium)..." 
                className="pl-9 h-10 bg-card/40 border-border/50 font-mono text-xs focus-visible:ring-violet-500/20"
            />
        </div>
        <Button variant="outline" className="h-10 border-border/50 bg-card/40 px-4 text-[10px] font-black uppercase tracking-widest">
            <Filter className="h-3.5 w-3.5 mr-2" /> All Filters
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground">
            <Download className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <PaginatedTable 
            data={trades} 
            columns={columns} 
            isLoading={loading}
            rowClassName={(item) => item.sentiment === "Bullish" ? "bg-green-500/[0.02]" : item.sentiment === "Bearish" ? "bg-red-500/[0.02]" : ""}
        />
      </div>
    </div>
  )
}
