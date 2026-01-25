"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

const data = [
  { name: 'Technology', value: 45 },
  { name: 'Finance', value: 25 },
  { name: 'Energy', value: 15 },
  { name: 'Healthcare', value: 10 },
  { name: 'Consumer', value: 5 },
];

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444'];

export function ExposureChart() {
  return (
    <Card className="col-span-4 lg:col-span-2 h-full">
      <CardHeader>
        <CardTitle>Sector Exposure</CardTitle>
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
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
