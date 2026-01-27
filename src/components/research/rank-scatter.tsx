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
    <Card className="h-full border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md flex flex-col">
        <CardHeader className="py-2 px-3 border-b border-zinc-800/50 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Rank vs Factor Score</CardTitle>
            <Badge variant="outline" className="h-4 text-[8px] border-emerald-500/30 text-emerald-500 bg-emerald-500/5 font-mono uppercase tracking-tighter">Universe Distribution</Badge>
        </CardHeader>
        <CardContent className="flex-1 p-2 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#27272a" vertical={false} />
                    <XAxis type="number" dataKey="rank" name="Rank" tick={{fontSize: 9, fill: '#52525b'}} stroke="#3f3f46" axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="factor_signal" name="Score" tick={{fontSize: 9, fill: '#52525b'}} stroke="#3f3f46" axisLine={false} tickLine={false} />
                    <Tooltip 
                        cursor={{ strokeDasharray: '3 3', stroke: '#10b981', strokeWidth: 1 }}
                        contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '10px', borderRadius: '4px', padding: '4px 8px'}}
                        itemStyle={{color: '#e4e4e7', padding: 0}}
                    />
                    <Scatter name="Universe" data={data} fill="#3f3f46">
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.symbol === focusSymbol ? '#10b981' : '#27272a'} 
                                stroke={entry.symbol === focusSymbol ? '#10b981' : '#3f3f46'}
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
