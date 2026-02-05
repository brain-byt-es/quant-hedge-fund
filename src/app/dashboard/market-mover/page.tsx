"use client"

import { useState, useEffect, useCallback } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
    IconTrendingUp, 
    IconTrendingDown,
    IconRefresh,
    IconActivity,
    IconMoon,
    IconSun
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

interface MoverItem {
  symbol: string
  name: string
  price: number
  change: number
  changesPercentage: number
}

export default function MarketMoverPage() {
    const [movers, setMovers] = useState<MoverItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeType, setActiveType] = useState("gainers")

    const fetchMovers = useCallback(async () => {
        setIsLoading(true)
        try {
            // Simulated dummy data based on reference structure
            const dummyGainers: MoverItem[] = [
                { symbol: "TSLA", name: "Tesla Inc", price: 185.50, change: 12.4, changesPercentage: 7.2 },
                { symbol: "NVDA", name: "NVIDIA Corp", price: 145.20, change: 8.5, changesPercentage: 6.2 },
                { symbol: "AMD", name: "Advanced Micro Devices", price: 162.30, change: 6.1, changesPercentage: 3.9 },
            ]
            const dummyLosers: MoverItem[] = [
                { symbol: "AAPL", name: "Apple Inc", price: 232.10, change: -4.2, changesPercentage: -1.8 },
                { symbol: "MSFT", name: "Microsoft Corp", price: 410.12, change: -2.5, changesPercentage: -0.6 },
            ]
            setMovers(activeType === "gainers" ? dummyGainers : dummyLosers)
        } catch {
            toast.error("Failed to fetch market movers")
        } finally {
            setIsLoading(false)
        }
    }, [activeType])

    useEffect(() => {
        fetchMovers()
    }, [fetchMovers])

    const columns = [
        {
            header: "Symbol",
            accessorKey: "symbol",
            className: "w-[100px]"
        },
        {
            header: "Name",
            accessorKey: "name",
            cell: (item: MoverItem) => (
                <span className="text-xs font-bold truncate max-w-[200px] block">{item.name}</span>
            )
        },
        {
            header: "Price",
            accessorKey: "price",
            cell: (item: MoverItem) => <span className="font-mono text-xs font-bold">${item.price.toFixed(2)}</span>
        },
        {
            header: "Change",
            accessorKey: "changesPercentage",
            cell: (item: MoverItem) => (
                <Badge className={cn(
                    "h-5 text-[10px] font-black border-none",
                    item.changesPercentage >= 0 ? "bg-green-600 text-white" : "bg-red-600 text-white"
                )}>
                    {item.changesPercentage >= 0 ? "+" : ""}{item.changesPercentage.toFixed(2)}%
                </Badge>
            )
        },
        {
            header: "Change ($)",
            accessorKey: "change",
            cell: (item: MoverItem) => (
                <span className={cn("font-mono text-xs font-bold", item.change >= 0 ? "text-green-500" : "text-red-500")}>
                    {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}
                </span>
            )
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconActivity className="size-6 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Market Movers</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Daily Volatility Leaders & Unusual Price Action
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-muted/30 p-1 rounded-full border border-border/50">
                        <Button variant="ghost" size="sm" className="h-7 rounded-full px-3 text-[9px] font-black uppercase tracking-widest gap-1.5"><IconSun className="size-3" /> Pre</Button>
                        <Button variant="ghost" size="sm" className="h-7 rounded-full px-3 text-[9px] font-black uppercase tracking-widest bg-background text-primary shadow-sm">Regular</Button>
                        <Button variant="ghost" size="sm" className="h-7 rounded-full px-3 text-[9px] font-black uppercase tracking-widest gap-1.5"><IconMoon className="size-3" /> Post</Button>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50" onClick={fetchMovers}>
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Update
                    </Button>
                </div>
            </div>

            <Tabs value={activeType} onValueChange={setActiveType} className="w-full">
                <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-4">
                    <TabsList className="h-9 bg-muted/20 border border-border/50 p-1 rounded-lg">
                        <TabsTrigger value="gainers" className="text-[10px] uppercase font-black px-6 gap-2 data-[state=active]:bg-green-500/10 data-[state=active]:text-green-500">
                            <IconTrendingUp className="size-3.5" /> Top Gainers
                        </TabsTrigger>
                        <TabsTrigger value="losers" className="text-[10px] uppercase font-black px-6 gap-2 data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500">
                            <IconTrendingDown className="size-3.5" /> Top Losers
                        </TabsTrigger>
                        <TabsTrigger value="active" className="text-[10px] uppercase font-black px-6 gap-2">
                            <IconActivity className="size-3.5" /> Most Active
                        </TabsTrigger>
                    </TabsList>
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Showing Top 20 Results</span>
                </div>

                <div className="flex-1 min-h-0">
                    <PaginatedTable 
                        data={movers} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </Tabs>
        </div>
    )
}
