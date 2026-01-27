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
    
    // Technical Indicators (SMA, EMA, BB, RSI, MACD)
    // [ ... existing indicator logic ... ]
    const sma = (arr: number[], period: number) => arr.map((_, i) => i < period - 1 ? null : arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period)
    const ema = (arr: number[], period: number) => {
      const k = 2 / (period + 1); const emaArr = [arr[0]];
      for (let i = 1; i < arr.length; i++) emaArr.push(arr[i] * k + emaArr[i - 1] * (1 - k));
      return emaArr
    }
    const std = (arr: number[], period: number) => arr.map((_, i) => {
        if (i < period - 1) return null; const slice = arr.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        return Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period)
    })

    const sma20 = sma(prices, 20); const sma50 = sma(prices, 50); const sma200 = sma(prices, 200); const ema21 = ema(prices, 21);
    const std20 = std(prices, 20); const bbUpper = sma20.map((m, i) => m !== null ? m + (std20[i] || 0) * 2 : null); const bbLower = sma20.map((m, i) => m !== null ? m - (std20[i] || 0) * 2 : null);
    
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

    return data.map((d, i) => ({
      ...d,
      sma20: sma20[i], sma50: sma50[i], sma200: sma200[i], ema21: ema21[i],
      bbUpper: bbUpper[i], bbLower: bbLower[i], rsi: rsi14[i],
      macd: (ema(prices, 12)[i] || 0) - (ema(prices, 26)[i] || 0)
    })).map((d, i, arr) => ({
        ...d, macdSignal: i > 0 ? (d.macd * (2/10) + (arr[i-1] as TechnicalDataPoint).macd * (1 - 2/10)) : d.macd
    })).map(d => ({
        ...d, macdHist: d.macd - (d.macdSignal || 0)
    })) as TechnicalDataPoint[]
  }, [data])

  return (
    <div className="flex flex-col gap-1.5 h-full font-mono bg-black p-1">
      {/* 1. MAIN PRICE PANE (60%) */}
      <div className="flex-[6] min-h-0 border border-zinc-800 rounded-sm bg-[#050505] relative group shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        {/* Chart Legend Overlay */}
        <div className="absolute top-2 right-3 z-20 flex flex-col items-end gap-0.5 pointer-events-none select-none">
            <span className="text-[7px] text-zinc-600 uppercase tracking-[0.3em] font-black mb-1">Overlay Matrix</span>
            <div className="flex gap-3">
                <span className="text-[8px] text-white flex items-center gap-1"><div className="h-1 w-2 bg-white" /> Price</span>
                <span className="text-[8px] text-yellow-500 flex items-center gap-1"><div className="h-1 w-2 bg-yellow-500" /> SMA 20</span>
                <span className="text-[8px] text-blue-500 flex items-center gap-1"><div className="h-1 w-2 bg-blue-500" /> SMA 50</span>
                <span className="text-[8px] text-purple-500 flex items-center gap-1"><div className="h-1 w-2 bg-purple-500" /> SMA 200</span>
                <span className="text-[8px] text-red-500 flex items-center gap-1"><div className="h-1 w-2 bg-red-500" /> EMA 21</span>
            </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="1 4" stroke="#1a1a1a" vertical={false} />
            <XAxis dataKey="date" hide />
            <YAxis domain={['auto', 'auto']} orientation="right" tick={{fontSize: 9, fill: '#444'}} axisLine={false} tickLine={false} />
            <Tooltip 
                contentStyle={{backgroundColor: '#000', borderColor: '#333', fontSize: '9px', padding: '4px'}}
                itemStyle={{padding: '0px'}}
            />
            
            <Area type="monotone" dataKey="bbUpper" stroke="none" fill="#3b82f6" fillOpacity={0.03} />
            <Area type="monotone" dataKey="bbLower" stroke="none" fill="#3b82f6" fillOpacity={0.03} />
            
            <Line type="monotone" dataKey="close" stroke="#ffffff" strokeWidth={1.5} dot={false} animationDuration={0} isAnimationActive={false} />
            <Line type="monotone" dataKey="sma20" stroke="#eab308" strokeWidth={0.8} dot={false} animationDuration={0} isAnimationActive={false} />
            <Line type="monotone" dataKey="sma50" stroke="#3b82f6" strokeWidth={0.8} dot={false} animationDuration={0} isAnimationActive={false} />
            <Line type="monotone" dataKey="sma200" stroke="#a855f7" strokeWidth={0.8} dot={false} animationDuration={0} isAnimationActive={false} />
            <Line type="monotone" dataKey="ema21" stroke="#ef4444" strokeWidth={1.2} dot={false} animationDuration={0} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 2. VOLUME PANE (10%) */}
      <div className="flex-[1] min-h-[60px] border border-zinc-800 rounded-sm bg-[#050505] overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <YAxis orientation="right" tick={{fontSize: 7, fill: '#444'}} axisLine={false} tickLine={false} domain={[0, 'dataMax']} />
            <Bar dataKey="volume" fill="#222" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 3. MACD PANE (15%) */}
      <div className="flex-[1.5] min-h-[80px] border border-zinc-800 rounded-sm bg-[#050505] overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <YAxis orientation="right" tick={{fontSize: 7, fill: '#444'}} axisLine={false} tickLine={false} />
            <Bar dataKey="macdHist" fill="#333" />
            <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="macdSignal" stroke="#f97316" strokeWidth={1} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 4. RSI PANE (15%) */}
      <div className="flex-[1.5] min-h-[80px] border border-zinc-800 rounded-sm bg-[#050505] overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
            <XAxis dataKey="date" tick={{fontSize: 7, fill: '#444'}} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} orientation="right" tick={{fontSize: 7, fill: '#444'}} axisLine={false} tickLine={false} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine y={30} stroke="#10b981" strokeDasharray="2 2" opacity={0.5} />
            <Line type="monotone" dataKey="rsi" stroke="#a855f7" strokeWidth={1} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
