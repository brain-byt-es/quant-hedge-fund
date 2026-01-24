"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { time: "09:30", value: 100000, benchmark: 100000 },
  { time: "10:00", value: 100200, benchmark: 100100 },
  { time: "10:30", value: 100150, benchmark: 100120 },
  { time: "11:00", value: 100450, benchmark: 100250 },
  { time: "11:30", value: 100300, benchmark: 100300 },
  { time: "12:00", value: 100600, benchmark: 100400 },
  { time: "12:30", value: 100550, benchmark: 100350 },
  { time: "13:00", value: 100800, benchmark: 100500 },
  { time: "13:30", value: 100900, benchmark: 100600 },
  { time: "14:00", value: 100750, benchmark: 100550 },
  { time: "14:30", value: 101100, benchmark: 100700 },
  { time: "15:00", value: 101300, benchmark: 100800 },
  { time: "15:30", value: 101200, benchmark: 100750 },
  { time: "16:00", value: 101500, benchmark: 100900 },
]

export function PortfolioChart() {
  return (
    <Card className="col-span-4 lg:col-span-3">
      <CardHeader>
        <CardTitle>Portfolio Performance</CardTitle>
        <CardDescription>
          Strategy (Cyan) vs S&P 500 Benchmark (Green)
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `$${value}`}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--card-foreground)'
                }}
                itemStyle={{ color: 'var(--foreground)' }}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
              <Area 
                type="monotone" 
                dataKey="benchmark" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorBenchmark)" 
                name="S&P 500"
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="var(--primary)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                name="Strategy"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
