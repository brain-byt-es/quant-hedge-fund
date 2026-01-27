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
    <Card className="h-full border-zinc-800 bg-zinc-950 flex flex-col">
        <CardHeader className="py-2 border-b border-zinc-800 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                {symbol} • Lookback {lookback} Bars
            </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 relative min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} orientation="right" tick={{fontSize: 10, fill: '#71717a'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px'}}
                        itemStyle={{color: '#e4e4e7'}}
                        labelStyle={{color: '#71717a'}}
                    />
                    <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  )
}
