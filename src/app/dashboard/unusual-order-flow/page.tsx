"use client"

import { useState, useEffect } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { Badge } from "@/components/ui/badge"
import { 
    IconActivity, 
    IconRefresh,
    IconSearch,
    IconFilter,
    IconDownload,
    IconTrendingUp,
    IconTrendingDown,
    IconBuildingBank
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface DarkPoolTrade {
  time: string
  ticker: string
  symbol: string
  price: number
  size: number
  premium: number
  exchange: string
  transactionType: "DP" | "B" | "T"
  sentiment: "Bullish" | "Bearish" | "Neutral"
  changesPercentage?: number
  change_percent?: number
}

export default function UnusualOrderFlowPage() {
    const [trades, setTrades] = useState<DarkPoolTrade[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")

    const fetchFlow = async () => {
        setIsLoading(true)
        try {
            // Simulated dummy data based on reference structure
            const dummyData: DarkPoolTrade[] = [
                { time: "14:45:12", ticker: "NVDA", symbol: "NVDA", price: 145.20, size: 250000, premium: 36300000, exchange: "Dark Pool", transactionType: "DP", sentiment: "Bullish", change_percent: 2.4 },
                { time: "14:44:05", ticker: "AAPL", symbol: "AAPL", price: 232.10, size: 120000, premium: 27852000, exchange: "NYSE", transactionType: "B", sentiment: "Neutral", change_percent: 0.5 },
                { time: "14:42:50", ticker: "TSLA", symbol: "TSLA", price: 185.50, size: 85000, premium: 15767500, exchange: "Dark Pool", transactionType: "DP", sentiment: "Bearish", change_percent: -1.2 },
                { time: "14:40:12", ticker: "MSFT", symbol: "MSFT", price: 410.12, size: 50000, premium: 20506000, exchange: "IEX", transactionType: "B", sentiment: "Bullish", change_percent: 1.1 },
                { time: "14:38:55", ticker: "AMD", symbol: "AMD", price: 162.30, size: 150000, premium: 24345000, exchange: "Dark Pool", transactionType: "DP", sentiment: "Bullish", change_percent: 4.1 },
            ]
            setTrades(dummyData)
        } catch (err) {
            toast.error("Failed to fetch dark pool flow")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchFlow()
    }, [])

    const formatPremium = (val: number) => {
        if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`
        if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`
        return `$${val}`
    }

    const columns = [
        { header: "Time", accessorKey: "time", className: "w-[80px] opacity-50 font-mono text-[10px]" },
        { header: "Ticker", accessorKey: "ticker", className: "w-[80px]" },
        { 
            header: "Action", 
            accessorKey: "transactionType",
            cell: (item: DarkPoolTrade) => (
                <Badge variant="outline" className={cn(
                    "h-4 text-[8px] font-black uppercase tracking-tighter px-1",
                    item.transactionType === "DP" ? "bg-violet-500/10 text-violet-500 border-violet-500/20" : "bg-muted text-muted-foreground"
                )}>
                    {item.transactionType === "DP" ? "Dark Pool" : "Block"}
                </Badge>
            )
        },
        { 
            header: "Price", 
            accessorKey: "price",
            cell: (item: DarkPoolTrade) => <span className="font-mono text-xs font-bold">${item.price.toFixed(2)}</span>
        },
        { 
            header: "Size", 
            accessorKey: "size",
            cell: (item: DarkPoolTrade) => <span className="font-mono text-xs opacity-70">{item.size.toLocaleString()}</span>
        },
        { 
            header: "Premium", 
            accessorKey: "premium",
            cell: (item: DarkPoolTrade) => <span className="font-black text-primary">{formatPremium(item.premium)}</span>
        },
        { 
            header: "Exchange", 
            accessorKey: "exchange",
            cell: (item: DarkPoolTrade) => <span className="text-[9px] font-bold text-muted-foreground uppercase">{item.exchange}</span>
        }
    ]

    return (
        <div className="flex flex-col h-full space-y-6 p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconBuildingBank className="size-6 text-violet-500" />
                        <h1 className="text-2xl font-black tracking-tighter italic uppercase">Unusual Order Flow</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1 text-violet-500/70">
                        Institutional Dark Pool Prints & Major Block Orders
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest bg-card/40">
                        <IconDownload className="size-3 mr-2" /> Export
                    </Button>
                    <Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                        <IconActivity className="size-3 mr-2" /> Live Stream
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 flex items-center gap-2">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground opacity-50" />
                        <Input 
                            placeholder="Search large prints (e.g. >$10M Premium)..." 
                            className="pl-9 h-10 bg-card/40 border-border/50 font-mono text-xs focus-visible:ring-violet-500/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="h-10 border-border/50 bg-card/40 px-4 text-[10px] font-black uppercase tracking-widest">
                        <IconFilter className="size-4 mr-2" /> All Filters
                    </Button>
                </div>
                <Button className="h-10 bg-muted/20 hover:bg-muted/30 text-foreground font-black uppercase tracking-widest">
                    <IconRefresh className="size-4 mr-2" /> Refresh
                </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                <PaginatedTable 
                    data={trades} 
                    columns={columns} 
                    isLoading={isLoading} 
                />
            </div>
        </div>
    )
}
