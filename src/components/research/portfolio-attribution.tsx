"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    TooltipProps
} from "recharts"
import { TrendingUp, TrendingDown, Target, Zap } from "lucide-react"

interface AttributionData {
    strategy_hash: string
    name: string
    equity: number
    allocation: number
    total_pnl: number
    return_pct: number
    sharpe: number
    history: { timestamp: string, equity: number }[]
}

export function PortfolioAttribution({ data }: { data: AttributionData[] }) {
    if (!data || data.length === 0) {
        return (
            <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex items-center justify-center p-8">
                <div className="text-center space-y-2">
                    <Target className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        No active strategy attribution found
                    </p>
                </div>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {data.map((strat) => (
                <StrategyCard key={strat.strategy_hash} strat={strat} />
            ))}
        </div>
    )
}

function StrategyCard({ strat }: { strat: AttributionData }) {
    const isProfitable = strat.total_pnl >= 0;

    return (
        <Card className="border-border/50 bg-card/40 backdrop-blur-md overflow-hidden flex flex-col hover:border-primary/30 transition-colors group">
            <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-row items-center justify-between bg-card/20">
                <div className="space-y-1">
                    <CardTitle className="text-xs font-mono uppercase tracking-widest text-foreground flex items-center gap-2">
                        <Zap className="w-3 h-3 text-primary" />
                        {strat.name}
                    </CardTitle>
                    <div className="text-[9px] text-muted-foreground font-mono truncate max-w-[150px]">
                        ID: {strat.strategy_hash}
                    </div>
                </div>
                <Badge variant={isProfitable ? "default" : "destructive"} className="font-mono text-[10px]">
                    {isProfitable ? '+' : ''}{strat.return_pct.toFixed(2)}%
                </Badge>
            </CardHeader>
            <CardContent className="p-4 flex-1 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="space-y-1">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Equity</div>
                        <div className="text-sm font-mono font-bold">${strat.equity.toLocaleString()}</div>
                    </div>
                    <div className="space-y-1 border-x border-border/30">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Total P&L</div>
                        <div className={`text-sm font-mono font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                            ${strat.total_pnl.toLocaleString()}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Sharpe (Est)</div>
                        <div className="text-sm font-mono font-bold">{strat.sharpe.toFixed(2)}</div>
                    </div>
                </div>

                <div className="h-24 w-full opacity-80 group-hover:opacity-100 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={strat.history}>
                            <defs>
                                <linearGradient id={`colorEquity-${strat.strategy_hash}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={isProfitable ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={isProfitable ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area 
                                type="monotone" 
                                dataKey="equity" 
                                stroke={isProfitable ? "#10b981" : "#ef4444"} 
                                fillOpacity={1} 
                                fill={`url(#colorEquity-${strat.strategy_hash})`} 
                                strokeWidth={2}
                            />
                            <Tooltip content={<CustomTooltip />} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 border border-border p-2 rounded shadow-xl backdrop-blur-md">
                <p className="text-[10px] font-mono text-muted-foreground">
                    {new Date(payload[0].payload.timestamp).toLocaleString()}
                </p>
                <p className="text-xs font-mono font-bold text-primary">
                    Equity: ${payload[0].value?.toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};
