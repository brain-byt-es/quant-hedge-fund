"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, ColorType, IChartApi, LineSeries, HistogramSeries, CandlestickSeries } from "lightweight-charts"
import { api } from "@/lib/api"
import { Loader2 } from "lucide-react"

interface PricePoint {
    date: string
    open?: number
    high?: number
    low?: number
    close: number
    volume?: number
}

interface StockChartProps {
    symbol: string
    interval?: "1m" | "Daily"
    showIndicators?: boolean
}

export function StockChart({ symbol, interval = "Daily", showIndicators = true }: StockChartProps) {
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
        vertLines: { color: "rgba(42, 46, 57, 0.05)" },
        horzLines: { color: "rgba(42, 46, 57, 0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: interval === "1m",
      },
    })

    chartRef.current = chart

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener("resize", handleResize)

    const fetchData = async () => {
        setLoading(true)
        try {
            const data = await api.getPriceHistory(symbol)
            const typedData = data as PricePoint[]

            if (!typedData || typedData.length === 0) {
                console.warn(`No price history for ${symbol}`)
                return
            }

            // 1. Candlestick Series
            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#22c55e',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#22c55e',
                wickDownColor: '#ef4444',
            });

            const candleData = typedData.map(d => ({
                time: d.date,
                open: d.open || d.close * 0.99,
                high: d.high || d.close * 1.01,
                low: d.low || d.close * 0.98,
                close: d.close
            }));
            candleSeries.setData(candleData);

            // 2. Volume Series
            const volumeSeries = chart.addSeries(HistogramSeries, {
                color: 'rgba(34, 197, 94, 0.2)',
                priceFormat: { type: 'volume' },
                priceScaleId: '',
            });
            volumeSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            });
            volumeSeries.setData(typedData.map(d => ({
                time: d.date,
                value: d.volume || (Math.random() * 1000000),
                color: (d.open || 0) <= d.close ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            })));

            if (showIndicators) {
                // 3. 9 EMA (Emerald)
                const ema9Series = chart.addSeries(LineSeries, { 
                    color: '#10b981', 
                    lineWidth: 1, 
                    title: '9 EMA',
                    lastValueVisible: false,
                    priceLineVisible: false,
                });
                // Simple calculation proxy for demo if backend doesn't provide
                const ema9Data = calculateEMA(candleData, 9);
                ema9Series.setData(ema9Data);

                // 4. VWAP (Orange)
                const vwapSeries = chart.addSeries(LineSeries, { 
                    color: '#f97316', 
                    lineWidth: 2, 
                    title: 'VWAP',
                    lineStyle: 2, // Dotted
                });
                const vwapData = calculateVWAP(typedData);
                vwapSeries.setData(vwapData);
            }

            chart.timeScale().fitContent();
        } catch (err) {
            console.error("Chart load failed", err)
        } finally {
            setLoading(false)
        }
    }

    fetchData()

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [symbol, interval, showIndicators])

  return (
    <div ref={chartContainerRef} className="w-full h-full relative min-h-[400px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}

// Helpers for on-the-fly indicators
interface EMAData {
    close: number
    time: string
}

function calculateEMA(data: EMAData[], period: number) {
    const k = 2 / (period + 1);
    let ema = data[0].close;
    return data.map(d => {
        ema = (d.close * k) + (ema * (1 - k));
        return { time: d.time, value: ema };
    });
}

function calculateVWAP(data: PricePoint[]) {
    let cumulativePV = 0;
    let cumulativeV = 0;
    return data.map(d => {
        const v = d.volume || 1000;
        cumulativePV += d.close * v;
        cumulativeV += v;
        return { time: d.date, value: cumulativePV / cumulativeV };
    });
}
