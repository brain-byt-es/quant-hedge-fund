"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, ColorType, IChartApi, LineSeries, HistogramSeries } from "lightweight-charts"
import { api } from "@/lib/api"
import { Loader2 } from "lucide-react"

interface PricePoint {
    date: string
    close: number
    volume?: number
}

export function StockChart({ symbol }: { symbol: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0)" },
        horzLines: { color: "rgba(42, 46, 57, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener("resize", handleResize)

    // Initial Data Fetch
    api.getPriceHistory(symbol)
      .then(data => {
        // Price Series (Line)
        const lineSeries = chart.addSeries(LineSeries, { 
            color: '#22c55e',
            lineWidth: 2,
            crosshairMarkerVisible: true,
        });
        
        // Volume Series (Histogram) - Positioned at bottom
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '', // Overlay on the same scale
        });

        // Set scale for volume to keep it at the bottom (0-25% of height)
        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        // Map data
        const typedData = data as PricePoint[]
        const lineData = typedData.map((d) => ({ 
            time: d.date, 
            value: d.close 
        }));

        const volData = typedData.map((d) => ({
            time: d.date,
            value: d.volume || (Math.random() * 1000000), 
            color: 'rgba(34, 197, 94, 0.3)'
        }));
        
        lineSeries.setData(lineData);
        volumeSeries.setData(volData);
        
        chart.timeScale().fitContent();
      })
      .catch(err => console.error("Chart data error", err))
      .finally(() => setLoading(false))

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [symbol])

  return (
    <div ref={chartContainerRef} className="w-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}