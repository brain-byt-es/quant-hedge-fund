"use client"

import { useEffect, useRef } from "react"
import { createChart, ColorType, IChartApi, AreaSeries } from "lightweight-charts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ChartDataPoint {
  time: string;
  value: number;
  benchmark?: number;
}

interface PortfolioChartProps {
  data?: ChartDataPoint[];
}

export function PortfolioChart({ data = [] }: PortfolioChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

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
      height: 350,
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    })

    const benchmarkSeries = chart.addSeries(AreaSeries, {
      lineColor: "#10b981",
      topColor: "rgba(16, 185, 129, 0.3)",
      bottomColor: "rgba(16, 185, 129, 0)",
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
    })

    const strategySeries = chart.addSeries(AreaSeries, {
      lineColor: "#0ea5e9",
      topColor: "rgba(14, 165, 233, 0.3)",
      bottomColor: "rgba(14, 165, 233, 0)",
      lineWidth: 3,
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
    })

    // Map and set data
    if (data.length > 0) {
        const benchmarkData = data.filter(d => d.benchmark !== undefined).map(d => ({
            time: d.time,
            value: d.benchmark!
        }))
        const strategyData = data.map(d => ({
            time: d.time,
            value: d.value
        }))

        benchmarkSeries.setData(benchmarkData)
        strategySeries.setData(strategyData)
        chart.timeScale().fitContent()
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener("resize", handleResize)
    chartRef.current = chart

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [data])

  return (
    <Card className="col-span-4 lg:col-span-3 border-border/50 bg-card/20 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex justify-between items-center">
            Portfolio Performance
            <div className="flex gap-4 text-[10px]">
                <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" /> STRATEGY</span>
                <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" /> S&P 500</span>
            </div>
        </CardTitle>
        <CardDescription className="text-xs font-mono uppercase tracking-tighter opacity-50">
          Historical Equity Growth vs Benchmark
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <div ref={chartContainerRef} className="w-full" />
      </CardContent>
    </Card>
  )
}