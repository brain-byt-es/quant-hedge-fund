"use client"

interface SentimentBarProps {
  bullish: number // 0-100
  bearish: number // 0-100
  bullishPremium: string
  bearishPremium: string
}

export function SentimentBar({ bullish, bearish, bullishPremium, bearishPremium }: SentimentBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
        <div className="flex flex-col">
            <span className="text-green-500">Bullish</span>
            <span className="text-xs font-mono tabular-nums">{bullish}% ({bullishPremium})</span>
        </div>
        <span className="text-muted-foreground opacity-50 font-mono">Options Sentiment</span>
        <div className="flex flex-col items-end">
            <span className="text-red-500">Bearish</span>
            <span className="text-xs font-mono tabular-nums">({bearishPremium}) {bearish}%</span>
        </div>
      </div>
      <div className="h-3 w-full bg-muted/20 rounded-full overflow-hidden border border-border/10 flex">
        <div 
            className="h-full bg-green-500/40 transition-all duration-1000 ease-out border-r border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
            style={{ width: `${bullish}%` }}
        />
        <div 
            className="h-full bg-red-500/40 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            style={{ width: `${bearish}%` }}
        />
      </div>
    </div>
  )
}
