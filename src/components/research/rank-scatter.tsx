"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts"

interface ScatterData {
  rank: number;
  factor_signal: number;
  symbol: string;
  [key: string]: unknown;
}

export function RankScatter({ data, focusSymbol }: { data: ScatterData[], focusSymbol: string }) {
  return (
    <Card className="h-full border-zinc-800 bg-zinc-950 flex flex-col">
        <CardHeader className="py-2 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Rank vs Factor Score</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-2 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" dataKey="rank" name="Rank" tick={{fontSize: 10, fill: '#71717a'}} stroke="#3f3f46" />
                    <YAxis type="number" dataKey="factor_signal" name="Score" tick={{fontSize: 10, fill: '#71717a'}} stroke="#3f3f46" />
                    <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px'}}
                        itemStyle={{color: '#e4e4e7'}}
                    />
                    <Scatter name="Universe" data={data} fill="#8884d8">
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.symbol === focusSymbol ? '#10b981' : '#3f3f46'} 
                                stroke={entry.symbol === focusSymbol ? '#10b981' : 'none'}
                                strokeWidth={2}
                            />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  )
}
