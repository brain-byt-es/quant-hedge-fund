"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    IconChartCandle, 
    IconRefresh,
    IconSearch,
    IconArrowRight,
    IconBuildingSkyscraper,
    IconCategory
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Link from "next/link"

const SECTORS = [
    { name: "Technology", companies: 412, performance: "+2.4%", status: "Bullish" },
    { name: "Energy", companies: 138, performance: "-1.2%", status: "Bearish" },
    { name: "Financials", companies: 220, performance: "+0.8%", status: "Neutral" },
    { name: "Healthcare", companies: 185, performance: "+1.5%", status: "Bullish" },
    { name: "Consumer Cyclical", companies: 156, performance: "+0.4%", status: "Neutral" },
    { name: "Industrials", companies: 124, performance: "+1.1%", status: "Bullish" },
]

export default function IndustryPage() {
    const [search, setSearch] = useState("")

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconCategory className="size-6 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Market Sectors</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Performance Breakdown by Industry & Sector
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input 
                            placeholder="Search Industry..." 
                            className="h-9 pl-9 text-[11px] font-bold uppercase tracking-widest bg-muted/20 border-border/50 rounded-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SECTORS.map((sector, i) => (
                    <Card key={i} className="border-border/50 bg-card/20 backdrop-blur-sm group hover:border-primary/30 transition-all cursor-pointer">
                        <CardHeader className="py-4 border-b border-border/50 flex flex-row items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-background border border-border/50 flex items-center justify-center text-primary">
                                    <IconBuildingSkyscraper className="size-5" />
                                </div>
                                <CardTitle className="text-sm font-black uppercase tracking-tight">{sector.name}</CardTitle>
                            </div>
                            <Badge variant="outline" className={cn(
                                "text-[9px] font-black uppercase border-none h-5",
                                sector.status === "Bullish" ? "bg-green-500/10 text-green-500" : 
                                sector.status === "Bearish" ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                            )}>{sector.status}</Badge>
                        </CardHeader>
                        <CardContent className="p-4 flex flex-col space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase">1D Performance</span>
                                    <span className={cn("text-xl font-black font-mono", sector.performance.startsWith('+') ? "text-green-500" : "text-red-500")}>
                                        {sector.performance}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase">Constituents</span>
                                    <span className="text-xl font-black font-mono">{sector.companies}</span>
                                </div>
                            </div>
                            <Button variant="ghost" className="w-full h-8 text-[10px] font-black uppercase tracking-widest bg-background/50 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                View Full Industry List <IconArrowRight className="size-3 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
