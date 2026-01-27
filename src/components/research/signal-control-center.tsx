"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

const QUICK_TICKERS = ["RGTI", "GE", "KGC", "BCS", "QBTS", "BE", "IREN", "MU", "EOSE", "APH", "SBSW", "B", "OKLO", "PLTR", "NEM", "PL", "WDC", "HOOD", "IAG", "GLW"]

interface SignalControlCenterProps {
    symbol: string
    setSymbol: (s: string) => void
    lookback: number
    setLookback: (l: number) => void
}

export function SignalControlCenter({ symbol, setSymbol, lookback, setLookback }: SignalControlCenterProps) {
  return (
    <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800/50">
            {/* Quick Focus Section */}
            <div className="p-3 flex-1">
                <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest block mb-2">Quick Universe Focus</label>
                <div className="flex flex-wrap gap-1.5">
                    {QUICK_TICKERS.map(t => (
                        <button 
                            key={t} 
                            className={`h-6 text-[10px] px-2 font-mono rounded transition-all border ${symbol === t ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
                            onClick={() => setSymbol(t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selection Section */}
            <div className="p-3 w-full md:w-[400px] flex items-center gap-4">
                <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest flex items-center gap-1">
                        <Search className="h-2.5 w-2.5" /> Focus Symbol
                    </label>
                    <Input 
                        className="h-8 text-xs font-mono bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 uppercase tracking-widest" 
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    />
                </div>
                <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Lookback</label>
                        <span className="text-[10px] font-mono text-emerald-500">{lookback} Days</span>
                    </div>
                    <Slider 
                        value={[lookback]} 
                        onValueChange={(v) => setLookback(v[0])} 
                        min={20} 
                        max={504} 
                        step={1}
                        className="py-2"
                    />
                </div>
            </div>
        </div>
    </Card>
  )
}
