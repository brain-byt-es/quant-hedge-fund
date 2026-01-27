"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
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
    <Card className="border-border/50 bg-card/40 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/50">
            {/* Quick Focus Section */}
            <div className="p-4 flex-1">
                <label className="text-xs uppercase text-muted-foreground font-black tracking-widest block mb-3">Quick Universe Focus</label>
                <div className="flex flex-wrap gap-2">
                    {QUICK_TICKERS.map(t => (
                        <button 
                            key={t} 
                            className={`h-7 text-xs px-3 font-mono rounded-lg transition-all border font-bold ${symbol === t ? 'bg-primary/20 border-primary/50 text-primary shadow-sm shadow-primary/10' : 'bg-background/50 border-border text-muted-foreground hover:border-accent hover:text-accent-foreground'}`}
                            onClick={() => setSymbol(t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selection Section */}
            <div className="p-4 w-full md:w-[450px] flex items-center gap-6">
                <div className="flex-1 space-y-2">
                    <label className="text-xs uppercase text-muted-foreground font-black tracking-widest flex items-center gap-2">
                        <Search className="h-3 w-3 text-primary" /> Focus Symbol
                    </label>
                    <Input 
                        className="h-9 text-sm font-mono bg-background/50 border-border focus-visible:ring-primary/30 uppercase tracking-widest font-black" 
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs uppercase text-muted-foreground font-black tracking-widest">Lookback</label>
                        <span className="text-xs font-mono text-primary font-bold">{lookback} Days</span>
                    </div>
                    <Slider 
                        value={[lookback]} 
                        onValueChange={(v) => setLookback(v[0])} 
                        min={20} 
                        max={504} 
                        step={1}
                        className="py-3"
                    />
                </div>
            </div>
        </div>
    </Card>
  )
}
