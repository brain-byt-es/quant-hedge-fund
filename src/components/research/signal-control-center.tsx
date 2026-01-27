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
    <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader className="py-2 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Signal Control Center</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
                <label className="text-[10px] uppercase text-zinc-600 font-bold">Quick Focus</label>
                <div className="flex flex-wrap gap-1">
                    {QUICK_TICKERS.map(t => (
                        <Button 
                            key={t} 
                            variant="outline" 
                            size="sm" 
                            className={`h-6 text-[10px] px-2 font-mono ${symbol === t ? 'border-emerald-500 text-emerald-500 bg-emerald-950/20' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
                            onClick={() => setSymbol(t)}
                        >
                            {t}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] uppercase text-zinc-600 font-bold">Focus Symbol</label>
                    <div className="relative">
                        <Search className="absolute left-2 top-1.5 h-3 w-3 text-zinc-500" />
                        <Input 
                            className="h-7 text-xs font-mono pl-7 bg-black border-zinc-800 uppercase" 
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-[10px] uppercase text-zinc-600 font-bold">Lookback</label>
                        <span className="text-[10px] font-mono text-zinc-400">{lookback} Days</span>
                    </div>
                    <Slider 
                        value={[lookback]} 
                        onValueChange={(v) => setLookback(v[0])} 
                        min={20} 
                        max={504} 
                        step={1}
                        className="py-1"
                    />
                </div>
            </div>
        </CardContent>
    </Card>
  )
}
