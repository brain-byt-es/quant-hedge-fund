"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardPosition {
  symbol: string
  market_value: number
}

interface ExposureChartProps {
  positions?: DashboardPosition[];
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'];

export function ExposureChart({ positions = [] }: ExposureChartProps) {
  const hasPositions = positions.length > 0;
  
  const totalValue = positions.reduce((acc, p) => acc + Math.abs(p.market_value), 0);
  const data = hasPositions 
    ? positions
        .map((p) => ({ symbol: p.symbol, value: Math.abs(p.market_value), percent: (Math.abs(p.market_value) / totalValue) * 100 }))
        .sort((a, b) => b.value - a.value)
    : [{ symbol: 'CASH', value: 100, percent: 100 }];

  return (
    <Card className="col-span-4 lg:col-span-2 border-border/50 bg-card/20 backdrop-blur-sm h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
            {data.slice(0, 6).map((item, idx) => (
                <div key={item.symbol} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-black font-mono tracking-tighter">{item.symbol}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{item.percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden border border-border/10">
                        <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ 
                                width: `${item.percent}%`,
                                backgroundColor: hasPositions ? COLORS[idx % COLORS.length] : '#334155',
                                boxShadow: `0 0 10px ${hasPositions ? COLORS[idx % COLORS.length] + '40' : 'transparent'}`
                            }}
                        />
                    </div>
                </div>
            ))}
            {!hasPositions && (
                <div className="h-full flex items-center justify-center py-10 text-muted-foreground/30 italic text-[10px] uppercase font-black tracking-widest">
                    Awaiting Market Exposure
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
