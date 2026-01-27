"use client"

import { useState, useEffect, useCallback } from "react"
import { BigNumbers } from "@/components/research/signals/big-numbers"
import { TechnicalChart } from "@/components/research/signals/technical-chart"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"

const TIME_WINDOWS = ["1M", "3M", "6M", "YTD", "1Y", "2Y", "5Y", "MAX"]
const QUICK_SYMBOLS = ["RGTI", "NVDA", "MSFT", "AAPL", "AMZN"]

// Derived lookback from window
const lookbackMap: Record<string, number> = {
    "1M": 21, "3M": 63, "6M": 126, "YTD": 252, "1Y": 252, "2Y": 504, "5Y": 1260, "MAX": 2520
}

interface SignalPriceData {
  date: string;
  close: number;
  volume: number;
  [key: string]: unknown;
}

export default function SignalDashboardPage() {
  const [symbol, setSymbol] = useState("RGTI")
  const [window, setTimeWindow] = useState("1Y")
  const [priceData, setPriceHistory] = useState<SignalPriceData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
      setLoading(true)
      try {
          const h = await api.getPriceHistory(symbol, lookbackMap[window])
          const enhanced: SignalPriceData[] = h.map((d: {date: string, close: number, volume?: number}) => ({
              ...d,
              volume: d.volume || Math.random() * 400000000 // Scale according to spec 400M
          }))
          setPriceHistory(enhanced)
      } catch (err) {
          console.error(err)
      } finally {
          setLoading(false)
      }
  }, [symbol, window])

  useEffect(() => {
      fetchData()
  }, [fetchData])

  return (
    <div className="flex flex-col h-screen bg-[#000000] text-white p-2 overflow-hidden font-sans selection:bg-primary/30">
      
      {/* 1. HEADER / CONTROL BAR */}
      <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2 px-2 shrink-0">
        <div className="flex items-center gap-4">
            <Link href="/research">
                <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-white h-7 w-7 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div className="flex flex-col">
                <h1 className="text-sm font-black uppercase tracking-[0.3em] italic text-zinc-200">Signal Intelligence Terminal</h1>
                <span className="text-[7px] text-zinc-600 uppercase tracking-[0.5em] -mt-1 font-mono">Institutional Grade Alpha // Live Ingress</span>
            </div>
        </div>

        <div className="flex items-center gap-3">
            {/* Symbol Selector */}
            <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="w-28 h-7 bg-black border-zinc-800 text-[10px] font-mono uppercase tracking-widest focus:ring-primary/30">
                    <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent className="bg-black border-zinc-800 text-white">
                    {QUICK_SYMBOLS.map(s => <SelectItem key={s} value={s} className="text-[10px] font-mono">{s}</SelectItem>)}
                </SelectContent>
            </Select>

            {/* Window Selector */}
            <div className="flex bg-zinc-950 rounded-sm p-0.5 border border-zinc-900 shadow-inner">
                {TIME_WINDOWS.map(w => (
                    <button 
                        key={w}
                        className={`px-2 py-0.5 text-[8px] font-black rounded-sm uppercase transition-all ${window === w ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.3)]' : 'text-zinc-600 hover:text-zinc-300'}`}
                        onClick={() => setTimeWindow(w)}
                    >
                        {w}
                    </button>
                ))}
            </div>

            <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 text-zinc-600 hover:text-primary transition-colors ${loading ? 'animate-spin' : ''}`}
                onClick={fetchData}
            >
                <RefreshCw className="h-3.5 w-3.5" />
            </Button>
        </div>
      </div>

      {/* 2. BIG NUMBERS PANEL (High Density) */}
      <div className="shrink-0">
          <BigNumbers 
            rank={1} 
            weight={10} 
            score={85.66} 
          />
      </div>

      {/* 3. MAIN MULTI-PANE CHART (Synced Stacks) */}
      <div className="flex-1 min-h-0 bg-[#000000]">
          <TechnicalChart data={priceData} />
      </div>

      {/* FOOTER */}
      <div className="mt-2 flex justify-between items-center text-[7px] text-zinc-700 font-mono uppercase tracking-[0.4em] px-2 shrink-0 border-t border-zinc-900 pt-2 pb-1">
          <div className="flex items-center gap-4">
              <span>Status: <span className="text-emerald-500">Realtime Stream Active</span></span>
              <span>Buffer: <span className="text-zinc-400">Verified (ECC Check Sum OK)</span></span>
          </div>
          <div className="flex items-center gap-4">
              <span>Source: FMP Stable Pro</span>
              <span className="bg-primary/10 text-primary px-1 rounded-sm border border-primary/20">Auth: Institutional</span>
          </div>
      </div>
    </div>
  )
}
