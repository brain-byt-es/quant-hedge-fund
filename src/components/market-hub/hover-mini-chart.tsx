"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, ColorType, AreaSeries, Time } from "lightweight-charts"
import { api } from "@/lib/api"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface HoverMiniChartProps {
  symbol: string
  changesPercentage: number
}

interface PriceData {
    date: string
    close: number
}

export function HoverMiniChart({ symbol, changesPercentage }: HoverMiniChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const isPositive = changesPercentage >= 0

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "Space Grotesk",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(148, 163, 184, 0.1)" },
      },
      width: 240,
      height: 120,
      timeScale: {
        visible: false,
      },
      rightPriceScale: {
        visible: false,
      },
      handleScroll: false,
      handleScale: false,
    })

    const series = chart.addSeries(AreaSeries, {
      lineColor: isPositive ? "#22c55e" : "#ef4444",
      topColor: isPositive ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
      bottomColor: "rgba(0, 0, 0, 0)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    api.getPriceHistory(symbol, 20) // Last 20 days for mini plot
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
            const typedData = data as PriceData[]
            series.setData(typedData.map(d => ({
                time: d.date as Time,
                value: d.close
            })))
            chart.timeScale().fitContent()
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => chart.remove()
  }, [symbol, isPositive])

  return (
    <div className="w-[240px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-2xl p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20">
            <span className="text-[10px] font-black font-mono tracking-tighter uppercase">{symbol}</span>
            <span className={cn(
                "text-[10px] font-bold tabular-nums",
                isPositive ? "text-green-500" : "text-red-500"
            )}>
                {isPositive ? "+" : ""}{changesPercentage.toFixed(2)}%
            </span>
        </div>
        <div ref={chartContainerRef} className="relative min-h-[120px]">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" />
                </div>
            )}
        </div>
    </div>
  )
}
