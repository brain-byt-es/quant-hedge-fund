"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { useState } from "react"

// Mock Data Generator
const generateData = (points: number) => {
    let equity = 100000;
    let benchmark = 100000;
    const data = [];
    for (let i = 0; i < points; i++) {
        const change = (Math.random() - 0.48) * 500; // Slight upward bias
        const benchChange = (Math.random() - 0.49) * 400;
        equity += change;
        benchmark += benchChange;
        
        // Calculate drawdown (simplified)
        const peak = Math.max(equity, 105000); // Fake peak
        const drawdown = ((equity - peak) / peak) * 100;

        data.push({
            date: `2024-01-${(i % 30) + 1}`,
            equity: equity,
            benchmark: benchmark,
            drawdown: drawdown
        });
    }
    return data;
}

const data = generateData(100);

export function LivePerformanceChart() {
  const [range, setRange] = useState("1M")

  return (
    <Card className="h-full border-zinc-800 bg-zinc-950 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                Equity Curve & Drawdown
            </CardTitle>
            <div className="flex gap-1">
                {['1D', '1W', '1M', 'YTD', 'ALL'].map((r) => (
                    <Button 
                        key={r} 
                        variant="ghost" 
                        size="sm" 
                        className={`h-5 text-[10px] px-2 ${range === r ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        onClick={() => setRange(r)}
                    >
                        {r}
                    </Button>
                ))}
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 relative min-h-[300px]">
            {/* Main Equity Chart */}
            <div className="absolute inset-0 h-[80%]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis domain={['auto', 'auto']} orientation="right" tick={{fontSize: 10, fill: '#71717a'}} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px'}}
                            itemStyle={{color: '#e4e4e7'}}
                        />
                        <Area type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
                        <Area type="monotone" dataKey="benchmark" stroke="#52525b" strokeWidth={1} strokeDasharray="4 4" fill="transparent" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Drawdown Chart (Bottom 20%) */}
            <div className="absolute bottom-0 left-0 right-0 h-[20%] border-t border-zinc-800 bg-zinc-900/20">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <YAxis hide domain={[-20, 0]} />
                        <Area type="step" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
    </Card>
  )
}