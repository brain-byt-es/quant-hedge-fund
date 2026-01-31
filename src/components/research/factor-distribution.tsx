"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
import { useMemo } from "react"

interface DistributionData {
  momentum?: number;
  [key: string]: unknown;
}

export function FactorDistributionChart({ data }: { data: DistributionData[] }) {
  
  const histogramData = useMemo(() => {
      if (!data || data.length === 0) return []
      
      const bins = 20
      // Use Momentum as the primary distribution metric
      const scores = data.map(d => d.momentum).filter(s => typeof s === 'number') as number[]
      
      if (scores.length === 0) return []

      const min = Math.min(...scores)
      const max = Math.max(...scores)
      const binWidth = (max - min) / bins
      
      const hist = Array.from({length: bins}, (_, i) => ({
          binStart: (min + i * binWidth).toFixed(0),
          count: 0
      }))
      
      scores.forEach(s => {
          const binIndex = Math.min(Math.floor((s - min) / binWidth), bins - 1)
          if (binIndex >= 0) hist[binIndex].count++
      })
      
      return hist
  }, [data])

  return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex flex-col overflow-hidden">
        <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Momentum Distribution</CardTitle>
            <div className="flex gap-1">
                <div className="h-1 w-3 rounded-full bg-muted" />
                <div className="h-1 w-3 rounded-full bg-border" />
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 15, right: 10, bottom: 5, left: -35 }}>
                    <XAxis dataKey="binStart" tick={{fontSize: 8, fill: 'var(--muted-foreground)'}} interval={3} stroke="var(--muted)" axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip 
                        contentStyle={{backgroundColor: 'var(--popover)', borderColor: 'var(--border)', fontSize: '10px', borderRadius: '4px'}}
                        cursor={{fill: 'var(--muted)', opacity: 0.4}}
                    />
                    <Bar dataKey="count" fill="var(--chart-1)" stroke="var(--border)" strokeWidth={0.5} radius={[1, 1, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  )
}
