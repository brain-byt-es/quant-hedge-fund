"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
import { useMemo } from "react"

interface DistributionData {
  factor_signal: number;
  [key: string]: unknown;
}

export function FactorDistributionChart({ data }: { data: DistributionData[] }) {
  
  const histogramData = useMemo(() => {
      if (!data || data.length === 0) return []
      
      const bins = 20
      const scores = data.map(d => d.factor_signal)
      const min = Math.min(...scores)
      const max = Math.max(...scores)
      const binWidth = (max - min) / bins
      
      const hist = Array.from({length: bins}, (_, i) => ({
          binStart: (min + i * binWidth).toFixed(1),
          count: 0
      }))
      
      scores.forEach(s => {
          const binIndex = Math.min(Math.floor((s - min) / binWidth), bins - 1)
          if (binIndex >= 0) hist[binIndex].count++
      })
      
      return hist
  }, [data])

  return (
    <Card className="h-full border-zinc-800 bg-zinc-950 flex flex-col">
        <CardHeader className="py-2 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Factor Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 relative min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData}>
                    <XAxis dataKey="binStart" tick={{fontSize: 9, fill: '#71717a'}} interval={2} stroke="#3f3f46" />
                    <YAxis hide />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px'}}
                        cursor={{fill: '#27272a', opacity: 0.4}}
                    />
                    <Bar dataKey="count" fill="#3f3f46" radius={[2, 2, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  )
}
