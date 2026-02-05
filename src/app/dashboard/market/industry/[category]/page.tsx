"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    IconChartCandle, 
    IconArrowLeft,
    IconTrendingUp,
    IconDatabase,
    IconWorld
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useStock360 } from "@/components/providers/stock-360-provider"
import { useSettings } from "@/components/providers/settings-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

export default function IndustryDetailPage() {
    const params = useParams()
    const router = useRouter()
    const rawCategory = params.category as string
    const category = decodeURIComponent(rawCategory)
    const { openStock360 } = useStock360()
    const { settings, updateSettings } = useSettings()

    const [assets, setAssets] = useState<Asset[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState({
        count: 0,
        mcap: 0,
        revenue: 0
    })

    // Load Assets and Stats
    useEffect(() => {
        const loadData = async () => {
            if (!category) return
            setIsLoading(true)
            try {
                // Determine markets based on settings
                const markets = settings.showOnlyPreferred ? settings.preferredMarkets : undefined

                // 1. Fetch Real Stats (Filtered by Countries if active)
                const industryStats = await api.getIndustryDetails(category, markets)
                
                // 2. Fetch Assets (Filtered by Settings)
                const filters: Record<string, string | string[]> = { category: category }
                if (markets) {
                    filters["countries"] = markets
                }

                const data = await api.getAssetList('Equity', filters, 10000, 0)
                setAssets(data)

                // 3. Update Stats
                setStats({
                    count: industryStats.count || 0,
                    mcap: industryStats.market_cap || 0,
                    revenue: industryStats.total_revenue || 0
                })
            } catch (_e) {
                console.error(_e)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [category, settings.showOnlyPreferred, settings.preferredMarkets])

    const columns = [
        {
            header: "Symbol",
            accessorKey: "symbol",
            cell: (item: Asset) => <span className="font-black font-mono text-primary">{item.symbol}</span>,
            className: "w-[100px]",
            sortable: true
        },
        {
            header: "Name",
            accessorKey: "name",
            cell: (item: Asset) => <span className="text-xs font-bold truncate max-w-[300px] block">{item.name}</span>,
            sortable: true
        },
        {
            header: "Price",
            accessorKey: "price",
            cell: (item: Asset) => (
                <span className="font-mono font-bold text-foreground">
                    {item.price ? `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
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
            cell: (item: Asset) => <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-black uppercase tracking-widest">{item.exchange}</Badge>
        },
        {
            header: "Country",
            accessorKey: "country",
            cell: (item: Asset) => <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{item.country}</span>
        }
    ]

    return (
        <div className="flex flex-col space-y-8 py-6 h-full pb-10">
            {/* Header / Breadcrumb */}
            <div className="flex flex-col gap-6">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-fit text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors px-0"
                    onClick={() => router.back()}
                >
                    <IconArrowLeft className="size-3 mr-2" /> Back to Industry Overview
                </Button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_-5px_var(--primary)]">
                            <IconChartCandle className="size-8 text-primary" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
                                {category}
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium max-w-2xl leading-relaxed">
                                This industry contains <span className="text-foreground font-bold">{stats.count}</span> publicly traded companies 
                                {settings.showOnlyPreferred ? " in your preferred markets" : " globally"}.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-full border border-border/50 shadow-inner">
                            <Button 
                                variant={settings.showOnlyPreferred ? "default" : "ghost"} 
                                size="sm" 
                                className={cn(
                                    "h-7 text-[9px] font-black uppercase tracking-widest rounded-full px-3 transition-all",
                                    settings.showOnlyPreferred ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"
                                )}
                                onClick={() => updateSettings({ showOnlyPreferred: true })}
                            >
                                Preferred
                            </Button>
                            <Button 
                                variant={!settings.showOnlyPreferred ? "default" : "ghost"} 
                                size="sm" 
                                className={cn(
                                    "h-7 text-[9px] font-black uppercase tracking-widest rounded-full px-3 transition-all",
                                    !settings.showOnlyPreferred ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"
                                )}
                                onClick={() => updateSettings({ showOnlyPreferred: false })}
                            >
                                Global
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-border/40 bg-card/20 backdrop-blur-sm">
                    <CardHeader className="py-3 px-5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <IconDatabase className="size-3 text-primary" /> Total Stocks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4">
                        <div className="text-3xl font-black font-mono tracking-tighter">{stats.count}</div>
                    </CardContent>
                </Card>
                <Card className="border-border/40 bg-card/20 backdrop-blur-sm">
                    <CardHeader className="py-3 px-5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <IconTrendingUp className="size-3 text-emerald-500" /> Total Market Cap
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4">
                        <div className="text-3xl font-black font-mono tracking-tighter">
                            {stats.mcap > 0 ? `$${(stats.mcap / 1e9).toFixed(1)}B` : "$-"}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/40 bg-card/20 backdrop-blur-sm">
                    <CardHeader className="py-3 px-5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <IconWorld className="size-3 text-orange-500" /> Total Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4">
                        <div className="text-3xl font-black font-mono tracking-tighter">
                            {stats.revenue > 0 ? `$${(stats.revenue / 1e9).toFixed(1)}B` : "$-"}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assets Table */}
            <div className="flex-1 min-h-[500px] border border-border/40 rounded-3xl overflow-hidden bg-card/5 backdrop-blur-md relative shadow-2xl">
                <PaginatedTable 
                    data={assets} 
                    columns={columns} 
                    isLoading={isLoading} 
                    onRowClick={(item) => openStock360(item.symbol)}
                />
            </div>
        </div>
    )
}
