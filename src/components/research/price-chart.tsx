"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, ColorType, IChartApi, AreaSeries, Time } from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, TrendingUp } from "lucide-react"

interface PriceAnalysisPoint {
    date: string
    close: number
    [key: string]: unknown
}

interface PriceAnalysisChartProps {
  data: PriceAnalysisPoint[]
  symbol: string
  lookback: number
}

export function PriceAnalysisChart({ data, symbol, lookback }: PriceAnalysisChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
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
      height: 280,
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    })

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#0ea5e9",
      topColor: "rgba(14, 165, 233, 0.3)",
      bottomColor: "rgba(14, 165, 233, 0)",
      lineWidth: 2,
      title: "PRICE"
    })

    if (data && data.length > 0) {
        series.setData(data.map(d => ({
            time: d.date as Time,
            value: d.close
        })))
        chart.timeScale().fitContent()
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener("resize", handleResize)
    
    setTimeout(() => {
        setLoading(false)
    }, 0)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [data])

  return (
    <Card className="h-full border-border/50 bg-card/20 backdrop-blur-sm flex flex-col overflow-hidden shadow-xl">
        <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-primary" /> Price Analysis: {symbol || "---"}
            </CardTitle>
            <div className="text-[8px] font-bold opacity-50 uppercase font-mono">{lookback} DAYS LOOKBACK</div>
        </CardHeader>
        <CardContent className="flex-1 p-0 relative min-h-0">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            )}
            <div ref={chartContainerRef} className="w-full" />
        </CardContent>
    </Card>
  )
}