"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { 
    createChart, 
    ColorType, 
    CandlestickSeries, 
    HistogramSeries, 
    LineSeries,
    Time,
    LineWidth
} from "lightweight-charts"
import { Loader2 } from "lucide-react"

interface PriceData {
  date: string
  close: number
  volume: number
  open?: number
  high?: number
  low?: number
}

interface TechnicalDataPoint extends PriceData {
    sma20?: number | null
    sma50?: number | null
    sma200?: number | null
    ema21?: number | null
    rsi?: number | null
    macd?: number
    macdSignal?: number
    macdHist?: number
}

interface TechnicalChartProps {
  data: PriceData[]
}

export function TechnicalChart({ data }: TechnicalChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)

  const technicals = useMemo(() => {
    if (!data || data.length === 0) return []
    const prices = data.map(d => d.close)
    
    const ema = (arr: number[], period: number) => {
      const k = 2 / (period + 1); const emaArr = [arr[0]];
      for (let i = 1; i < arr.length; i++) emaArr.push(arr[i] * k + emaArr[i - 1] * (1 - k));
      return emaArr
    }
    
    const sma = (arr: number[], period: number) => arr.map((_, i) => i < period - 1 ? null : arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period)

    const sma20 = sma(prices, 20);
    const sma50 = sma(prices, 50);
    const sma200 = sma(prices, 200);
    const ema21 = ema(prices, 21);

    const calculateRSI = (arr: number[], period: number) => {
        const rsi = new Array(arr.length).fill(null); let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) { const diff = arr[i] - arr[i-1]; if (diff >= 0) gains += diff; else losses -= diff }
        let avgGain = gains / period, avgLoss = losses / period; rsi[period] = 100 - (100 / (1 + avgGain / (avgLoss || 1)));
        for (let i = period + 1; i < arr.length; i++) {
            const diff = arr[i] - arr[i-1]; const currGain = diff >= 0 ? diff : 0; const currLoss = diff < 0 ? -diff : 0;
            avgGain = (avgGain * (period - 1) + currGain) / period; avgLoss = (avgLoss * (period - 1) + currLoss) / period;
            rsi[i] = 100 - (100 / (1 + avgGain / (avgLoss || 1)))
        }
        return rsi
    }
    const rsi14 = calculateRSI(prices, 14)

    const ema12 = ema(prices, 12)
    const ema26 = ema(prices, 26)
    const macdLine = ema12.map((v, i) => v - ema26[i])
    const macdSignal = ema(macdLine, 9)
    const macdHist = macdLine.map((v, i) => v - macdSignal[i])

    return data.map((d, i) => ({
      ...d,
      sma20: sma20[i], sma50: sma50[i], sma200: sma200[i], ema21: ema21[i],
      rsi: rsi14[i],
      macd: macdLine[i], macdSignal: macdSignal[i], macdHist: macdHist[i]
    })) as TechnicalDataPoint[]
  }, [data])

  useEffect(() => {
    if (!containerRef.current || technicals.length === 0) return

    const commonOptions = {
        layout: {
            background: { type: ColorType.Solid, color: "transparent" },
            textColor: "#94a3b8",
            fontFamily: "var(--font-jetbrains-mono)",
        },
        grid: {
            vertLines: { color: "rgba(148, 163, 184, 0.05)" },
            horzLines: { color: "rgba(148, 163, 184, 0.05)" },
        },
        timeScale: {
            visible: false,
            borderVisible: false,
        },
        rightPriceScale: {
            borderVisible: false,
        },
        crosshair: {
            mode: 0,
        },
        handleScroll: true,
        handleScale: true,
    }

    // 1. PRICE CHART
    const priceChart = createChart("price-pane", {
        ...commonOptions,
        height: 400,
    })
    const candleSeries = priceChart.addSeries(CandlestickSeries, {
        upColor: '#22c55e', downColor: '#ef4444', borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444'
    })
    candleSeries.setData(technicals.map(d => ({
        time: d.date as Time, open: d.open || d.close * 0.99, high: d.high || d.close * 1.01, low: d.low || d.close * 0.98, close: d.close
    })))

    // Overlays
    const addLine = (color: string, width: number, dataKey: keyof TechnicalDataPoint) => {
        const s = priceChart.addSeries(LineSeries, { color, lineWidth: width as LineWidth, priceLineVisible: false, lastValueVisible: false })
        s.setData(technicals.filter(d => d[dataKey] !== null && d[dataKey] !== undefined).map(d => ({ time: d.date as Time, value: d[dataKey] as number })))
    }
    addLine('#60a5fa', 1, 'sma20')
    addLine('#10b981', 1, 'sma50')
    addLine('#f59e0b', 1, 'sma200')
    addLine('#ef4444', 2, 'ema21')

    // 2. VOLUME CHART
    const volumeChart = createChart("volume-pane", {
        ...commonOptions,
        height: 80,
    })
    const volumeSeries = volumeChart.addSeries(HistogramSeries, {
        color: 'rgba(148, 163, 184, 0.2)', priceFormat: { type: 'volume' }
    })
    volumeSeries.setData(technicals.map(d => ({
        time: d.date as Time, value: d.volume, color: (d.open || 0) <= d.close ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
    })))

    // 3. MACD CHART
    const macdChart = createChart("macd-pane", {
        ...commonOptions,
        height: 100,
    })
    const macdHist = macdChart.addSeries(HistogramSeries, { color: 'rgba(148, 163, 184, 0.3)' })
    const macdLine = macdChart.addSeries(LineSeries, { color: '#60a5fa', lineWidth: 1.5 as LineWidth, priceLineVisible: false })
    const macdSignal = macdChart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1.5 as LineWidth, priceLineVisible: false })
    
    macdHist.setData(technicals.map(d => ({ time: d.date as Time, value: d.macdHist || 0, color: (d.macdHist || 0) >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)' })))
    macdLine.setData(technicals.map(d => ({ time: d.date as Time, value: d.macd || 0 })))
    macdSignal.setData(technicals.map(d => ({ time: d.date as Time, value: d.macdSignal || 0 })))

    // 4. RSI CHART
    const rsiChart = createChart("rsi-pane", {
        ...commonOptions,
        height: 100,
        timeScale: { visible: true, borderVisible: false },
    })
    const rsiSeries = rsiChart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 2 as LineWidth, priceLineVisible: false })
    rsiSeries.setData(technicals.filter(d => d.rsi !== null && d.rsi !== undefined).map(d => ({ time: d.date as Time, value: d.rsi as number })))

    // SYNC LOGIC
    const charts = [priceChart, volumeChart, macdChart, rsiChart]
    charts.forEach(c => {
        c.timeScale().subscribeVisibleLogicalRangeChange(range => {
            if (!range) return
            charts.forEach(other => {
                if (other !== c) other.timeScale().setVisibleLogicalRange(range)
            })
        })
    })

    // Resize
    const handleResize = () => {
        const width = containerRef.current?.clientWidth || 0
        charts.forEach(c => c.applyOptions({ width }))
    }
    window.addEventListener("resize", handleResize)
    
    const timer = setTimeout(() => {
        setLoading(false)
    }, 0)

    return () => {
        clearTimeout(timer)
        window.removeEventListener("resize", handleResize)
        charts.forEach(c => c.remove())
    }
  }, [technicals])

  return (
    <div ref={containerRef} className="flex flex-col gap-1 h-full bg-background/50 p-2 custom-scrollbar overflow-y-auto">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div id="price-pane" className="shrink-0 border border-border/30 rounded-xl overflow-hidden bg-card/20" />
      <div id="volume-pane" className="shrink-0 border border-border/30 rounded-xl overflow-hidden bg-card/20" />
      <div id="macd-pane" className="shrink-0 border border-border/30 rounded-xl overflow-hidden bg-card/20" />
      <div id="rsi-pane" className="shrink-0 border border-border/30 rounded-xl overflow-hidden bg-card/20" />
    </div>
  )
}
