"use client"

import { useState, useEffect } from "react"
import { CompactGrid } from "@/components/market-hub/compact-grid"
import { Badge } from "@/components/ui/badge"
import { 
    IconStar, 
    IconRefresh,
    IconTarget,
    IconCurrencyDollar,
    IconTrendingUp
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface TopStock {
  symbol: string
  name: string
  analystCount: number
  avgPriceTarget: number
  upside: number
  rating: string
  marketCap: number
  changesPercentage?: number
  change_percent?: number
}

export default function TopAnalystStocksPage() {
    const [stocks, setStocks] = useState<TopStock[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchTopStocks = async () => {
        setIsLoading(true)
        try {
            // Simulated dummy data based on reference structure
            const dummyData: TopStock[] = [
                { symbol: "NVDA", name: "NVIDIA Corp", analystCount: 42, avgPriceTarget: 850.50, upside: 24.5, rating: "Strong Buy", marketCap: 2100000000000, change_percent: 2.4 },
                { symbol: "MSFT", name: "Microsoft Corp", analystCount: 38, avgPriceTarget: 450.20, upside: 15.8, rating: "Strong Buy", marketCap: 3100000000000, change_percent: 1.1 },
                { symbol: "AMZN", name: "Amazon.com Inc", analystCount: 35, avgPriceTarget: 210.00, upside: 18.2, rating: "Strong Buy", marketCap: 1800000000000, change_percent: 0.8 },
                { symbol: "GOOGL", name: "Alphabet Inc", analystCount: 33, avgPriceTarget: 175.40, upside: 12.4, rating: "Strong Buy", marketCap: 1900000000000, change_percent: -0.5 },
                { symbol: "META", name: "Meta Platforms", analystCount: 31, avgPriceTarget: 520.00, upside: 9.1, rating: "Strong Buy", marketCap: 1200000000000, change_percent: 3.2 },
            ]
            setStocks(dummyData)
        } catch (err) {
            toast.error("Failed to fetch top analyst stocks")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchTopStocks()
    }, [])

    const formatLarge = (num: number) => {
        if (num >= 1e12) return (num / 1e12).toFixed(2) + "T"
        if (num >= 1e9) return (num / 1e9).toFixed(2) + "B"
        if (num >= 1e6) return (num / 1e6).toFixed(2) + "M"
        return num.toLocaleString()
    }

    const columns = [
        {
            header: "Symbol",
            accessorKey: "symbol",
            className: "w-[100px]"
        },
        {
            header: "Name",
            accessorKey: "name",
            cell: (item: TopStock) => (
                <span className="text-xs font-bold truncate max-w-[200px] block">{item.name}</span>
            )
        },
        {
            header: "Analyst High Conviction",
            accessorKey: "analystCount",
            cell: (item: TopStock) => (
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-none h-5 font-black">
                        {item.analystCount} ANALYSTS
                    </Badge>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Strong Buy</span>
                </div>
            )
        },
        {
            header: "Avg Target",
            accessorKey: "avgPriceTarget",
            cell: (item: TopStock) => (
                <span className="font-mono text-xs font-bold text-foreground">
                    ${item.avgPriceTarget.toFixed(2)}
                </span>
            )
        },
        {
            header: "Target Upside",
            accessorKey: "upside",
            cell: (item: TopStock) => (
                <div className="flex items-center gap-1.5">
                    <IconTrendingUp className="size-3 text-green-500" />
                    <span className="font-mono text-xs font-black text-green-500">
                        +{item.upside}%
                    </span>
                </div>
            )
        },
        {
            header: "Market Cap",
            accessorKey: "marketCap",
            cell: (item: TopStock) => (
                <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    {formatLarge(item.marketCap)}
                </span>
            )
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconStar className="size-5 text-amber-400 fill-amber-400" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Strong Buy Consensus</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Aggregated recommendations from top-performing 5-star analysts
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchTopStocks}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Refresh List
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Analyst Top Conviction Picks</span>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">HIGHEST UPSIDE</Badge>
                    </div>
                    <CompactGrid 
                        data={stocks} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </div>
        </div>
    )
}