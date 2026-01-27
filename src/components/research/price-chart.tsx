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
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex flex-col overflow-hidden shadow-xl">
        <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between bg-muted/20">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {symbol} {"//"} Price Action {"//"} {lookback} Bars
            </CardTitle>
            <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_5px_var(--primary)]" />
                <span className="text-[9px] font-mono text-primary uppercase tracking-tighter">Close</span>
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 relative">
            {!data || data.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                    Streaming Market Data...
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 15, right: 10, bottom: 5, left: -25 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis 
                            domain={['auto', 'auto']} 
                            orientation="right" 
                            tick={{fontSize: 9, fill: 'var(--muted-foreground)'}} 
                            axisLine={false} 
                            tickLine={false} 
                            tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip 
                            contentStyle={{backgroundColor: 'var(--popover)', borderColor: 'var(--border)', fontSize: '10px', borderRadius: '4px'}}
                            itemStyle={{color: 'var(--popover-foreground)'}}
                            labelStyle={{color: 'var(--muted-foreground)'}}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="close" 
                            stroke="var(--primary)" 
                            strokeWidth={2} 
                            dot={false} 
                            animationDuration={0}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </CardContent>
    </Card>
  )
}
