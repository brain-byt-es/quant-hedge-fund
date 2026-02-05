"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    IconTornado, 
    IconRefresh,
    IconActivity,
    IconChartBar,
    IconTrendingUp,
    IconTrendingDown,
    IconFlame
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export default function MarketFlowPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [fearGreed, setFearGreed] = useState(64) // Greed

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="flex flex-col space-y-6 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconTornado className="size-6 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Market Flow Tide</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Institutional Order Flow & Sentiment Gauges
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-6 px-3 bg-green-500/10 text-green-500 border-none font-black text-[10px] uppercase">Market: Open</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* FEAR & GREED GAUGE */}
                <Card className="border-border/50 bg-card/20 backdrop-blur-sm relative overflow-hidden">
                    <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <IconFlame className="size-3.5 text-orange-500" /> Fear & Greed Index
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col items-center">
                        <div className="relative h-32 w-full flex items-center justify-center">
                            <svg className="w-48 h-24" viewBox="0 0 100 50">
                                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
                                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="10" 
                                    strokeDasharray={`${fearGreed}, 100`} className="text-primary" />
                            </svg>
                            <span className="absolute bottom-0 text-3xl font-black font-mono">{fearGreed}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-primary mt-2">Greed Mode Active</span>
                    </CardContent>
                </Card>

                {/* VOLUME STATS */}
                <Card className="md:col-span-2 border-border/50 bg-card/20 backdrop-blur-sm">
                    <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <IconActivity className="size-3.5 text-primary" /> SP500 Market Tide
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-muted-foreground uppercase mb-1">Total Volume</span>
                                <span className="text-lg font-black font-mono text-foreground">14.2M</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-muted-foreground uppercase mb-1">Net Premium</span>
                                <span className="text-lg font-black font-mono text-green-500">+$2.1B</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-muted-foreground uppercase mb-1">P/C Ratio</span>
                                <span className="text-lg font-black font-mono text-primary">0.82</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-muted-foreground uppercase mb-1">Dark Pool Rank</span>
                                <span className="text-lg font-black font-mono text-amber-500">Tier 2</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* SECTOR FLOW TABLE SKELETON */}
            <Card className="border-border/50 bg-card/20 backdrop-blur-sm">
                <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <IconChartBar className="size-3.5 text-primary" /> Sector Allocation Flow
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/10">
                        {[
                            { s: "Technology", f: "+$840M", p: "Bullish", c: "text-green-500" },
                            { s: "Energy", f: "-$120M", p: "Bearish", c: "text-red-500" },
                            { s: "Financials", f: "+$240M", p: "Neutral", c: "text-primary" },
                            { s: "Healthcare", f: "+$45M", p: "Neutral", c: "text-primary" }
                        ].map((sector, i) => (
                            <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black">{sector.s}</span>
                                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Institutional Net</span>
                                </div>
                                <div className="flex items-center gap-8">
                                    <span className={cn("font-mono text-sm font-black", sector.c)}>{sector.f}</span>
                                    <Badge variant="outline" className={cn("text-[9px] font-black border-none h-5", 
                                        sector.p === "Bullish" ? "bg-green-500/10 text-green-500" : 
                                        sector.p === "Bearish" ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground")}>
                                        {sector.p}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
