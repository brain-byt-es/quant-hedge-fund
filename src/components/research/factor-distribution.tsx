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
    <Card className="h-full border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md flex flex-col overflow-hidden">
        <CardHeader className="py-2 px-3 border-b border-zinc-800/50 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Factor Distribution</CardTitle>
            <div className="flex gap-1">
                <div className="h-1 w-3 rounded-full bg-zinc-700" />
                <div className="h-1 w-3 rounded-full bg-zinc-800" />
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 15, right: 10, bottom: 5, left: -35 }}>
                    <XAxis dataKey="binStart" tick={{fontSize: 8, fill: '#52525b'}} interval={3} stroke="#3f3f46" axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '10px', borderRadius: '4px'}}
                        cursor={{fill: '#27272a', opacity: 0.4}}
                    />
                    <Bar dataKey="count" fill="#27272a" stroke="#3f3f46" strokeWidth={0.5} radius={[1, 1, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  )
}
