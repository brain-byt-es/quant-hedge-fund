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
    <div className="flex flex-col gap-2 h-full font-mono bg-background p-2">
      {/* 1. MAIN PRICE PANE (60%) */}
      <div className="flex-[6] min-h-0 border border-border rounded-xl bg-card/30 relative group shadow-2xl overflow-hidden">
        {/* Chart Legend Overlay */}
        <div className="absolute top-3 right-4 z-20 flex flex-col items-end gap-1 pointer-events-none select-none bg-background/40 backdrop-blur-md p-2 rounded-lg border border-border/50">
            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] font-black mb-1">Overlay Matrix</span>
            <div className="flex gap-4">
                <span className="text-xs text-foreground flex items-center gap-1.5 font-bold"><div className="h-1.5 w-3 bg-foreground rounded-full" /> Price</span>
                <span className="text-xs text-chart-4 flex items-center gap-1.5 font-bold"><div className="h-1.5 w-3 bg-chart-4 rounded-full" /> SMA 20</span>
                <span className="text-xs text-chart-1 flex items-center gap-1.5 font-bold"><div className="h-1.5 w-3 bg-chart-1 rounded-full" /> SMA 50</span>
                <span className="text-xs text-chart-3 flex items-center gap-1.5 font-bold"><div className="h-1.5 w-3 bg-chart-3 rounded-full" /> SMA 200</span>
                <span className="text-xs text-destructive flex items-center gap-1.5 font-bold"><div className="h-1.5 w-3 bg-destructive rounded-full" /> EMA 21</span>
            </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="1 4" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" hide />
            <YAxis 
                domain={['auto', 'auto']} 
                orientation="right" 
                tick={{fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 'bold'}} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(v) => `$${v}`}
            />
            <Tooltip 
                contentStyle={{backgroundColor: 'var(--popover)', borderColor: 'var(--border)', fontSize: '11px', padding: '8px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                itemStyle={{padding: '2px 0'}}
            />
            
            <Area type="monotone" dataKey="bbUpper" stroke="none" fill="var(--chart-1)" fillOpacity={0.05} />
            <Area type="monotone" dataKey="bbLower" stroke="none" fill="var(--chart-1)" fillOpacity={0.05} />
            
            <Line type="monotone" dataKey="close" stroke="var(--foreground)" strokeWidth={2} dot={false} animationDuration={0} isAnimationActive={false} />
            <Line type="monotone" dataKey="sma20" stroke="var(--chart-4)" strokeWidth={1} dot={false} animationDuration={0} isAnimationActive={false} />
            <Line type="monotone" dataKey="sma50" stroke="var(--chart-1)" strokeWidth={1} dot={false} animationDuration={0} isAnimationActive={false} />
            <Line type="monotone" dataKey="sma200" stroke="var(--chart-3)" strokeWidth={1} dot={false} animationDuration={0} isAnimationActive={false} />
            <Line type="monotone" dataKey="ema21" stroke="var(--destructive)" strokeWidth={1.5} dot={false} animationDuration={0} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 2. VOLUME PANE (10%) */}
      <div className="flex-[1] min-h-[70px] border border-border rounded-xl bg-card/20 overflow-hidden shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
            <YAxis orientation="right" tick={{fontSize: 9, fill: 'var(--muted-foreground)'}} axisLine={false} tickLine={false} domain={[0, 'dataMax']} />
            <Bar dataKey="volume" fill="var(--muted-foreground)" opacity={0.2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 3. MACD PANE (15%) */}
      <div className="flex-[1.5] min-h-[90px] border border-border rounded-xl bg-card/20 overflow-hidden shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
            <YAxis orientation="right" tick={{fontSize: 9, fill: 'var(--muted-foreground)'}} axisLine={false} tickLine={false} />
            <Bar dataKey="macdHist" fill="var(--muted-foreground)" opacity={0.3} />
            <Line type="monotone" dataKey="macd" stroke="var(--chart-1)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="macdSignal" stroke="var(--chart-4)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 4. RSI PANE (15%) */}
      <div className="flex-[1.5] min-h-[90px] border border-border rounded-xl bg-card/20 overflow-hidden shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={technicals} margin={{ top: 5, right: 15, left: -20, bottom: 25 }}>
            <XAxis dataKey="date" tick={{fontSize: 9, fill: 'var(--muted-foreground)', fontWeight: 'bold'}} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} orientation="right" tick={{fontSize: 9, fill: 'var(--muted-foreground)'}} axisLine={false} tickLine={false} />
            <ReferenceLine y={70} stroke="var(--destructive)" strokeDasharray="3 3" opacity={0.6} />
            <ReferenceLine y={30} stroke="var(--primary)" strokeDasharray="3 3" opacity={0.6} />
            <Line type="monotone" dataKey="rsi" stroke="var(--chart-3)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}