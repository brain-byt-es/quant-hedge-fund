"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, ColorType, AreaSeries, HistogramSeries, Time } from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Initial State (Day 0)
const initialData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (30 - i))
    const dateStr = date.toISOString().split('T')[0]
    return {
        time: dateStr,
        equity: 100000 + (Math.random() * 5000),
        benchmark: 100000 + (Math.random() * 2000),
        drawdown: -Math.random() * 2
    }
});

export function LivePerformanceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState("1M")

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart("live-perf-container", {
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
      height: 400,
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      crosshair: {
          mode: 0
      }
    })

    // 1. Equity Series
    const equitySeries = chart.addSeries(AreaSeries, {
      lineColor: "#0ea5e9",
      topColor: "rgba(14, 165, 233, 0.3)",
      bottomColor: "rgba(14, 165, 233, 0)",
      lineWidth: 3,
      title: "EQUITY"
    })

    // 2. Benchmark Series (Dashed Line)
    const benchmarkSeries = chart.addSeries(AreaSeries, {
        lineColor: "rgba(148, 163, 184, 0.5)",
        topColor: "rgba(148, 163, 184, 0.05)",
        bottomColor: "rgba(148, 163, 184, 0)",
        lineWidth: 1,
        lineStyle: 2,
        title: "SPY"
    })

    // 3. Drawdown Series
    const drawdownSeries = chart.addSeries(HistogramSeries, {
        color: 'rgba(239, 68, 68, 0.2)',
        priceFormat: { type: 'percent' },
        priceScaleId: 'drawdown',
    })

    chart.priceScale('drawdown').applyOptions({
        scaleMargins: {
            top: 0.85,
            bottom: 0,
        },
    })

    equitySeries.setData(initialData.map(d => ({ time: d.time as Time, value: d.equity })))
    benchmarkSeries.setData(initialData.map(d => ({ time: d.time as Time, value: d.benchmark })))
    drawdownSeries.setData(initialData.map(d => ({ time: d.time as Time, value: d.drawdown })))

    chart.timeScale().fitContent()

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
  }, [])

  return (
    <Card className="h-full border-border/50 bg-card/20 backdrop-blur-sm flex flex-col overflow-hidden shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <ActivityIcon className="h-3 w-3 text-primary" /> Equity Curve & Risk
            </CardTitle>
            <div className="flex gap-1 bg-background/50 p-0.5 rounded-md border border-border/50">
                {['1D', '1W', '1M', 'YTD', 'ALL'].map((r) => (
                    <Button 
                        key={r} 
                        variant="ghost" 
                        size="sm" 
                        className={`h-5 text-[9px] px-2 font-bold uppercase transition-all ${range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setRange(r)}
                    >
                        {r}
                    </Button>
                ))}
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 relative min-h-[400px]">
            <div id="live-perf-container" ref={chartContainerRef} className="w-full h-full" />
        </CardContent>
    </Card>
  )
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}