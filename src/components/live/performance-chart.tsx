"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { date: "Jan", strategy: 100, benchmark: 100, drawdown: 0 },
  { date: "Feb", strategy: 105, benchmark: 102, drawdown: 0 },
  { date: "Mar", strategy: 102, benchmark: 101, drawdown: -3 },
  { date: "Apr", strategy: 108, benchmark: 104, drawdown: 0 },
  { date: "May", strategy: 115, benchmark: 106, drawdown: 0 },
  { date: "Jun", strategy: 112, benchmark: 105, drawdown: -2 },
  { date: "Jul", strategy: 118, benchmark: 108, drawdown: 0 },
  { date: "Aug", strategy: 122, benchmark: 110, drawdown: 0 },
  { date: "Sep", strategy: 119, benchmark: 109, drawdown: -3 },
  { date: "Oct", strategy: 125, benchmark: 112, drawdown: 0 },
  { date: "Nov", strategy: 132, benchmark: 115, drawdown: 0 },
  { date: "Dec", strategy: 130, benchmark: 114, drawdown: -1 },
]

export function LivePerformanceChart() {
  return (
    <Card className="h-full border-zinc-800 bg-zinc-950/20">
      <CardHeader className="py-3 border-b border-zinc-800 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Cumulative Returns & Drawdown Profile</CardTitle>
        <div className="flex gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-primary rounded-full"/> Strategy</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-zinc-600 rounded-full"/> Benchmark (SPY)</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-rose-900/30 rounded-full"/> Drawdown</span>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorStrat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.5} />
              <XAxis 
                dataKey="date" 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}`}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: '#09090b', 
                    borderColor: '#27272a',
                    borderRadius: '4px',
                    fontSize: '10px',
                    color: '#fafafa'
                }}
              />
              {/* Drawdown Area at the top */}
              <Area 
                type="step" 
                dataKey="drawdown" 
                stroke="#ef4444" 
                strokeWidth={1}
                fillOpacity={1} 
                fill="url(#colorDD)" 
                name="Drawdown (%)"
              />
              {/* Benchmark Line */}
              <Area 
                type="monotone" 
                dataKey="benchmark" 
                stroke="#52525b" 
                strokeWidth={1.5}
                fill="transparent"
                name="SPY"
              />
              {/* Strategy Area */}
              <Area 
                type="monotone" 
                dataKey="strategy" 
                stroke="var(--primary)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorStrat)" 
                name="Strategy"
              />
              <ReferenceLine y={100} stroke="#52525b" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
