"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface DashboardPosition {
  symbol: string
  market_value: number
}

interface ExposureChartProps {
  positions?: DashboardPosition[];
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444'];

export function ExposureChart({ positions = [] }: ExposureChartProps) {
  // If no positions, assume 100% Cash
  const hasPositions = positions.length > 0;
  
  const data = hasPositions 
    ? positions.map((p, i) => ({ name: p.symbol, value: Math.abs(p.market_value) }))
    : [{ name: 'Cash', value: 100 }];

  return (
    <Card className="col-span-4 lg:col-span-2 h-full">
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={hasPositions ? COLORS[index % COLORS.length] : '#334155'} />
              ))}
            </Pie>
            <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--card-foreground)'
                }}
                itemStyle={{ color: 'var(--foreground)' }}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
