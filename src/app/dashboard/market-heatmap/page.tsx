"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Badge } from "@/components/ui/badge"
import { 
    IconRefresh,
    IconLayoutGrid
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Load Heatmap dynamically to avoid SSR issues with Highcharts
const MarketHeatmap = dynamic(() => import("@/components/market-heatmap").then(mod => mod.MarketHeatmap), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center h-[600px] w-full gap-4">
            <div className="grid grid-cols-4 gap-2 w-64 opacity-20">
                {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="bg-muted aspect-square rounded-sm animate-pulse" />
                ))}
            </div>
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest animate-pulse">
                Initializing Highcharts...
            </span>
        </div>
    )
})

export default function MarketHeatmapPage() {
    const [selectedETF, setSelectedETF] = useState("S&P 500")
    const [refreshKey, setRefreshKey] = useState(0)

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1)
    }

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconLayoutGrid className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Market Heatmap</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Visualizing Relative Performance & Market Cap Distribution
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-muted/30 p-1 rounded-full border border-border/50">
                        {["S&P 500", "NASDAQ 100", "DOW 30"].map((etf) => (
                            <Button 
                                key={etf}
                                variant="ghost" 
                                size="sm" 
                                className={cn(
                                    "h-7 rounded-full px-4 text-[9px] font-black uppercase tracking-widest transition-all",
                                    selectedETF === etf ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                                )}
                                onClick={() => setSelectedETF(etf)}
                            >
                                {etf}
                            </Button>
                        ))}
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={handleRefresh}
                    >
                        <IconRefresh className="size-3 mr-2" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1">
                <div className="bg-card/20 border border-border/50 rounded-2xl overflow-hidden min-h-[600px] relative">
                    <MarketHeatmap key={`${selectedETF}-${refreshKey}`} index={selectedETF} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-border/50 bg-card/20">
                    <CardHeader className="py-3 border-b border-border/50">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volume Leaders</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/20">
                            {[
                                { s: "NVDA", v: "142M", c: "+2.4%" },
                                { s: "TSLA", v: "98M", c: "-1.2%" },
                                { s: "AMD", v: "65M", c: "+4.1%" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors cursor-pointer">
                                    <span className="font-black font-mono text-sm">{item.s}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-xs opacity-50">{item.v}</span>
                                        <Badge variant="outline" className={cn("h-5 text-[10px] font-black border-none", item.c.startsWith('+') ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                            {item.c}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/20 md:col-span-2">
                    <CardHeader className="py-3 border-b border-border/50">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Market Sentiment</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="flex items-center gap-8">
                            <div className="flex flex-col items-center">
                                <span className="text-3xl font-black font-mono text-green-500">412</span>
                                <span className="text-[9px] font-black uppercase text-muted-foreground">Advancers</span>
                            </div>
                            <div className="h-12 w-[1px] bg-border/50" />
                            <div className="flex flex-col items-center">
                                <span className="text-3xl font-black font-mono text-red-500">88</span>
                                <span className="text-[9px] font-black uppercase text-muted-foreground">Decliners</span>
                            </div>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                            <div className="h-full bg-green-500" style={{ width: '82%' }} />
                            <div className="h-full bg-red-500" style={{ width: '18%' }} />
                        </div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Extreme Bullish Breadth Detected</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}