"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts"

interface ScatterData {
  rank: number;
  factor_signal: number;
  symbol: string;
  [key: string]: unknown;
}

export function RankScatter({ data, focusSymbol }: { data: ScatterData[], focusSymbol: string }) {
  return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex flex-col">
        <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Rank vs Factor Score</CardTitle>
            <Badge variant="outline" className="h-4 text-[8px] border-primary/30 text-primary bg-primary/5 font-mono uppercase tracking-tighter">Universe Distribution</Badge>
        </CardHeader>
        <CardContent className="flex-1 p-2 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" vertical={false} />
                    <XAxis type="number" dataKey="rank" name="Rank" tick={{fontSize: 9, fill: 'var(--muted-foreground)'}} stroke="var(--muted)" axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="factor_signal" name="Score" tick={{fontSize: 9, fill: 'var(--muted-foreground)'}} stroke="var(--muted)" axisLine={false} tickLine={false} />
                    <Tooltip 
                        cursor={{ strokeDasharray: '3 3', stroke: 'var(--primary)', strokeWidth: 1 }}
                        contentStyle={{backgroundColor: 'var(--popover)', borderColor: 'var(--border)', fontSize: '10px', borderRadius: '4px', padding: '4px 8px'}}
                        itemStyle={{color: 'var(--popover-foreground)', padding: 0}}
                    />
                    <Scatter name="Universe" data={data} fill="var(--muted)">
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.symbol === focusSymbol ? 'var(--primary)' : 'var(--muted)'} 
                                stroke={entry.symbol === focusSymbol ? 'var(--primary)' : 'var(--border)'}
                                strokeWidth={entry.symbol === focusSymbol ? 2 : 0.5}
                                r={entry.symbol === focusSymbol ? 5 : 3}
                            />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  )
}
