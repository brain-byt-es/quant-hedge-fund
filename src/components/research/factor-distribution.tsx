"use client"

import { useEffect, useRef, useMemo } from "react"
import { createOptionsChart, ColorType, HistogramSeries, HistogramData } from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DistributionData {
  momentum?: number;
  [key: string]: unknown;
}

export function FactorDistributionChart({ data }: { data: DistributionData[] }) {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const histogramData = useMemo(() => {
      if (!data || data.length === 0) return []
      
      const bins = 25
      const scores = data.map(d => d.momentum).filter(s => typeof s === 'number') as number[]
      
      if (scores.length === 0) return []

      const min = 0
      const max = 100
      const binWidth = (max - min) / bins
      
      const histMap = new Map<number, number>()
      for (let i = 0; i < bins; i++) {
          histMap.set(min + i * binWidth, 0)
      }
      
      scores.forEach(s => {
          const binStart = Math.floor(s / binWidth) * binWidth
          histMap.set(binStart, (histMap.get(binStart) || 0) + 1)
      })
      
      return Array.from(histMap.entries()).map(([time, value]) => ({
          time,
          value,
          color: value > 0 ? 'rgba(14, 165, 233, 0.5)' : 'rgba(14, 165, 233, 0.1)'
      })).sort((a, b) => a.time - b.time)
  }, [data])

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createOptionsChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "var(--font-jetbrains-mono)",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.05)" },
        horzLines: { color: "rgba(148, 163, 184, 0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 200,
      timeScale: {
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
        visible: false,
      },
      handleScroll: false,
      handleScale: false,
    })

    const series = chart.addSeries(HistogramSeries, {
      color: "#0ea5e9",
      priceFormat: { type: 'volume' },
    })

    if (histogramData.length > 0) {
        series.setData(histogramData as HistogramData<number>[])
        chart.timeScale().fitContent()
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [histogramData])

  return (
    <Card className="h-full border-border/50 bg-card/20 backdrop-blur-sm flex flex-col overflow-hidden">
        <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Momentum Distribution</CardTitle>
            <div className="flex gap-4 text-[8px] font-bold opacity-50">
                <span className="flex items-center gap-1"><div className="h-1 w-1 rounded-full bg-[#0ea5e9]" /> UNIVERSE</span>
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0">
            <div ref={chartContainerRef} className="w-full" />
        </CardContent>
    </Card>
  )
}