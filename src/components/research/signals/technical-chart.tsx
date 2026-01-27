"use client"

import { useMemo } from "react"
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Area,
  ReferenceLine
} from "recharts"

interface PriceData {
  date: string
  close: number
  volume: number
}

interface TechnicalDataPoint extends PriceData {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema21: number | null;
    bbUpper: number | null;
    bbLower: number | null;
    rsi: number | null;
    macd: number;
    macdSignal?: number;
    macdHist?: number;
}

interface TechnicalChartProps {
  data: PriceData[]
}

export function TechnicalChart({ data }: TechnicalChartProps) {
  const technicals = useMemo(() => {
    if (!data || data.length === 0) return []

    const prices = data.map(d => d.close)
    
    // Helper: SMA
    const sma = (arr: number[], period: number) => {
      return arr.map((_, i) => {
        if (i < period - 1) return null
        const slice = arr.slice(i - period + 1, i + 1)
        return slice.reduce((a, b) => a + b, 0) / period
      })
    }

    // Helper: EMA
    const ema = (arr: number[], period: number) => {
      const k = 2 / (period + 1)
      const emaArr = [arr[0]]
      for (let i = 1; i < arr.length; i++) {
        emaArr.push(arr[i] * k + emaArr[i - 1] * (1 - k))
      }
      return emaArr
    }

    const sma20 = sma(prices, 20)
    const sma50 = sma(prices, 50)
    const sma200 = sma(prices, 200)
    const ema21 = ema(prices, 21)

    // Bollinger Bands (20, 2)
    const std = (arr: number[], period: number) => {
        return arr.map((_, i) => {
            if (i < period - 1) return null
            const slice = arr.slice(i - period + 1, i + 1)
            const mean = slice.reduce((a, b) => a + b, 0) / period
            const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period
            return Math.sqrt(variance)
        })
    }
    const std20 = std(prices, 20)
    const bbUpper = sma20.map((m, i) => m !== null ? m + (std20[i] || 0) * 2 : null)
    const bbLower = sma20.map((m, i) => m !== null ? m - (std20[i] || 0) * 2 : null)

    // RSI (14)
    const calculateRSI = (arr: number[], period: number) => {
        const rsi = new Array(arr.length).fill(null)
        let gains = 0, losses = 0
        for (let i = 1; i <= period; i++) {
            const diff = arr[i] - arr[i-1]
            if (diff >= 0) gains += diff; else losses -= diff
        }
        let avgGain = gains / period, avgLoss = losses / period
        rsi[period] = 100 - (100 / (1 + avgGain / (avgLoss || 1)))
        
        for (let i = period + 1; i < arr.length; i++) {
            const diff = arr[i] - arr[i-1]
            const currGain = diff >= 0 ? diff : 0
            const currLoss = diff < 0 ? -diff : 0
            avgGain = (avgGain * (period - 1) + currGain) / period
            avgLoss = (avgLoss * (period - 1) + currLoss) / period
            rsi[i] = 100 - (100 / (1 + avgGain / (avgLoss || 1)))
        }
        return rsi
    }
    const rsi14 = calculateRSI(prices, 14)

    return data.map((d, i) => ({
      ...d,
      sma20: sma20[i],
      sma50: sma50[i],
      sma200: sma200[i],
      ema21: ema21[i],
      bbUpper: bbUpper[i],
      bbLower: bbLower[i],
      rsi: rsi14[i],
      macd: (ema(prices, 12)[i] || 0) - (ema(prices, 26)[i] || 0)
    })).map((d, i, arr) => ({
        ...d,
        macdSignal: i > 0 ? (d.macd * (2/10) + (arr[i-1] as TechnicalDataPoint).macd * (1 - 2/10)) : d.macd
    })).map(d => ({
        ...d,
        macdHist: d.macd - (d.macdSignal || 0)
    })) as TechnicalDataPoint[]
  }, [data])

  return (
    <div className="flex flex-col gap-2 h-full font-mono">
      {/* 1. MAIN PRICE PANE */}
      <div className="flex-[3] min-h-0 border border-zinc-800 rounded-lg bg-black/40 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
            <XAxis dataKey="date" hide />
            <YAxis domain={['auto', 'auto']} orientation="right" tick={{fontSize: 10, fill: '#52525b'}} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '10px'}} />
            
            {/* Bollinger Bands Fill */}
            <Area type="monotone" dataKey="bbUpper" stroke="none" fill="#3b82f6" fillOpacity={0.05} />
            <Area type="monotone" dataKey="bbLower" stroke="none" fill="#3b82f6" fillOpacity={0.05} />
            
            {/* Price Action */}
            <Line type="monotone" dataKey="close" stroke="#ffffff" strokeWidth={2} dot={false} animationDuration={0} />
            
            {/* Moving Averages */}
            <Line type="monotone" dataKey="sma20" stroke="#eab308" strokeWidth={1} dot={false} animationDuration={0} />
            <Line type="monotone" dataKey="sma50" stroke="#3b82f6" strokeWidth={1} dot={false} animationDuration={0} />
            <Line type="monotone" dataKey="sma200" stroke="#a855f7" strokeWidth={1} dot={false} animationDuration={0} />
            <Line type="monotone" dataKey="ema21" stroke="#ef4444" strokeWidth={1} dot={false} animationDuration={0} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 2. VOLUME PANE */}
      <div className="h-20 border border-zinc-800 rounded-lg bg-black/40 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <YAxis orientation="right" tick={{fontSize: 8, fill: '#52525b'}} axisLine={false} tickLine={false} />
            <Bar dataKey="volume" fill="#27272a" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 3. MACD PANE */}
      <div className="h-24 border border-zinc-800 rounded-lg bg-black/40 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <YAxis orientation="right" tick={{fontSize: 8, fill: '#52525b'}} axisLine={false} tickLine={false} />
            <Bar dataKey="macdHist" fill="#3f3f46" />
            <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="macdSignal" stroke="#f97316" strokeWidth={1} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 4. RSI PANE */}
      <div className="h-24 border border-zinc-800 rounded-lg bg-black/40 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
            <XAxis dataKey="date" tick={{fontSize: 8, fill: '#52525b'}} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} orientation="right" tick={{fontSize: 8, fill: '#52525b'}} axisLine={false} tickLine={false} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="rsi" stroke="#a855f7" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
