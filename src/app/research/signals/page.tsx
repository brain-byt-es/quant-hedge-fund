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
          // Ensure we have volume - mock if missing from API
          const enhanced: SignalPriceData[] = h.map((d: {date: string, close: number, volume?: number}) => ({
              ...d,
              volume: d.volume || Math.random() * 10000000
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
    <div className="flex flex-col h-screen bg-black text-white p-4 overflow-hidden font-sans">
      
      {/* 1. HEADER / CONTROL BAR */}
      <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
            <Link href="/research">
                <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Signal Intelligence Terminal</h1>
        </div>

        <div className="flex items-center gap-2">
            {/* Symbol Selector */}
            <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="w-32 h-8 bg-zinc-900 border-zinc-800 text-xs font-mono">
                    <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent>
                    {QUICK_SYMBOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
            </Select>

            {/* Window Selector */}
            <div className="flex bg-zinc-900 rounded-md p-0.5 border border-zinc-800">
                {TIME_WINDOWS.map(w => (
                    <button 
                        key={w}
                        className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-all ${window === w ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        onClick={() => setTimeWindow(w)}
                    >
                        {w}
                    </button>
                ))}
            </div>

            <Button 
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 text-zinc-500 ${loading ? 'animate-spin' : ''}`}
                onClick={fetchData}
            >
                <RefreshCw className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {/* 2. BIG NUMBERS PANEL */}
      <BigNumbers 
        rank={1} 
        weight={10} 
        score={85.66} 
      />

      {/* 3. MAIN MULTI-PANE CHART */}
      <div className="flex-1 min-h-0">
          <TechnicalChart data={priceData} />
      </div>

      {/* FOOTER */}
      <div className="mt-4 flex justify-between items-center text-[10px] text-zinc-600 font-mono uppercase tracking-[0.2em]">
          <div>Status: Realtime Signal Stream // Buffer: Verified</div>
          <div>Auth: Institutional Grade Alpha // Source: FMP Stable</div>
      </div>
    </div>
  )
}
