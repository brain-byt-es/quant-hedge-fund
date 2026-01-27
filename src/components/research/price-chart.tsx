"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface PriceData {
  date: string;
  close: number;
  [key: string]: unknown;
}

export function PriceAnalysisChart({ data, symbol, lookback }: { data: PriceData[], symbol: string, lookback: number }) {
  return (
    <Card className="h-full border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md flex flex-col overflow-hidden shadow-xl">
        <CardHeader className="py-2 px-3 border-b border-zinc-800/50 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                {symbol} // Price Action // {lookback} Bars
            </CardTitle>
            <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                <span className="text-[9px] font-mono text-blue-400 uppercase tracking-tighter">Close</span>
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 15, right: 10, bottom: 5, left: -25 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis 
                        domain={['auto', 'auto']} 
                        orientation="right" 
                        tick={{fontSize: 9, fill: '#52525b'}} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '10px', borderRadius: '4px'}}
                        itemStyle={{color: '#e4e4e7'}}
                        labelStyle={{color: '#71717a'}}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        dot={false} 
                        animationDuration={1000}
                    />
                </LineChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  )
}
