"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStock360 } from "@/components/providers/stock-360-provider"
import { 
    IconChartCandle, 
    IconSearch,
    IconArrowLeft,
    IconBuildingBank,
    IconChartPie,
    IconCoin
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface Asset {
    symbol: string
    name: string
    type: string
    category: string
    exchange: string
    country: string
    price?: number
    change_percent?: number
    market_cap?: number
}

// Helper
const abbreviateNumber = (num: number | undefined | null) => {
    if (!num) return "-"
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T"
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B"
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M"
    return num.toLocaleString()
}

export default function IndustryDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { openStock360 } = useStock360()
    
    // Category from URL (needs decoding)
    const categoryRaw = params?.category as string
    const category = decodeURIComponent(categoryRaw || "")

    const [assets, setAssets] = useState<Asset[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [stats, setStats] = useState({ count: 0, mcap: 0, revenue: 0 })

    // Load Assets for this Category
    useEffect(() => {
        const loadData = async () => {
            if (!category) return
            setIsLoading(true)
            try {
                // Fetch assets filtered by this exact category
                // We use the search/list endpoint with a filter
                // Note: category in DB might be "Sector - Industry" or just "Industry"
                // The API needs to support partial match or we try exact match first
                
                // Assuming 'getAssetList' supports filtering by category column
                const data = await api.getAssetList('Equity', { category: category }, 1000, 0)
                setAssets(data)
                
                // Calculate Stats (Client side for now, ideally backend)
                const totalMcap = data.reduce((acc: number, item: Asset) => {
                    // Handle case where market_cap might be a string from FinanceDB (e.g. "Large Cap") 
                    // vs number from FMP
                    const val = item.market_cap
                    if (typeof val === 'number') return acc + val
                    return acc
                }, 0)
                
                setStats({
                    count: data.length,
                    mcap: totalMcap,
                    revenue: 0 // Placeholder until we have revenue data
                })
            } catch (e) {
                console.error(e)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [category])

    const filteredAssets = assets.filter(a => 
        a.name.toLowerCase().includes(search.toLowerCase()) || 
        a.symbol.toLowerCase().includes(search.toLowerCase())
    )

    const columns = [
        {
            header: "Symbol",
            accessorKey: "symbol",
            cell: (item: Asset) => <span className="font-black font-mono text-primary">{item.symbol}</span>,
            className: "w-[80px]",
            sortable: true
        },
        {
            header: "Name",
            accessorKey: "name",
            cell: (item: Asset) => <span className="text-xs font-bold truncate max-w-[200px] block">{item.name}</span>,
            sortable: true
        },
        {
            header: "Market Cap",
            accessorKey: "market_cap",
            cell: (item: Asset) => <span className="font-mono text-xs text-muted-foreground">{abbreviateNumber(item.market_cap)}</span>,
            sortable: true,
            className: "text-right"
        },
        {
            header: "Price",
            accessorKey: "price",
            cell: (item: Asset) => (
                <span className="font-mono font-bold text-foreground">
                    {item.price ? `$${item.price.toFixed(2)}` : "-"}
                </span>
            ),
            sortable: true,
            className: "text-right"
        },
        {
            header: "Change",
            accessorKey: "change_percent",
            cell: (item: Asset) => {
                if (item.change_percent === undefined || item.change_percent === null) return <span className="text-muted-foreground">-</span>
                const isPos = item.change_percent >= 0
                return (
                    <span className={cn("font-mono font-bold", isPos ? "text-emerald-500" : "text-red-500")}>
                        {isPos ? "+" : ""}{item.change_percent.toFixed(2)}%
                    </span>
                )
            },
            sortable: true,
            className: "text-right"
        },
        {
            header: "Exchange",
            accessorKey: "exchange",
            cell: (item: Asset) => <span className="font-mono text-[9px] opacity-50 border border-border px-1 rounded">{item.exchange}</span>
        }
    ]

    return (
        <div className="flex flex-col space-y-8 h-full pb-20">
            {/* Nav Back */}
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="pl-0 hover:pl-2 transition-all">
                    <IconArrowLeft className="size-4 mr-2" /> Back to Overview
                </Button>
            </div>

            {/* Header / Stats */}
            <div className="flex flex-col space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic text-primary">
                        {category}
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                        This industry contains <strong className="text-foreground">{stats.count}</strong> publicly traded companies with a combined market capitalization of <strong className="text-foreground">${abbreviateNumber(stats.mcap)}</strong>.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-card/20 border border-border/40 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <IconBuildingBank className="size-3" /> Total Stocks
                        </span>
                        <span className="text-2xl font-black font-mono">{stats.count}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-card/20 border border-border/40 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <IconChartPie className="size-3" /> Total Market Cap
                        </span>
                        <span className="text-2xl font-black font-mono text-emerald-500">${abbreviateNumber(stats.mcap)}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-card/20 border border-border/40 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <IconCoin className="size-3" /> Total Revenue
                        </span>
                        <span className="text-2xl font-black font-mono opacity-50">-</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center bg-card/10 p-2 rounded-lg border border-border/40">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-6 bg-primary/10 text-primary border-primary/20">
                        {filteredAssets.length} Stocks
                    </Badge>
                </div>
                <div className="relative w-64">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input 
                        placeholder="Find ticker..."
                        className="h-8 pl-9 bg-muted/20 border-border/50 text-xs font-bold uppercase rounded-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <PaginatedTable 
                data={filteredAssets} 
                columns={columns} 
                isLoading={isLoading} 
                onRowClick={(item) => openStock360(item.symbol)}
            />
        </div>
    )
}