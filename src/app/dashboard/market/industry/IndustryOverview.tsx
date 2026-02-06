"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { CompactGrid } from "@/components/market-hub/compact-grid"
import { IconChartPie, IconArrowRight } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSettings } from "@/components/providers/settings-provider"

interface IndustryData {
    name: string
    count: number
    market_cap?: number
    perf_1d?: number
    // Compat
    symbol?: string
    ticker?: string
    changesPercentage?: number
    change_percent?: number
}

export default function IndustryOverview() {
    const router = useRouter()
    const { settings } = useSettings()
    const [overviewSectors, setOverviewSectors] = useState<Record<string, IndustryData[]>>({})
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                // Fetch Aggregated Industries
                // Note: getSectors doesn't support live filtering yet, but the aggregation task handles it.
                // For now, we show the global map structure but grouped.
                const res = await api.getSectors(1000, 'industry')
                const grouped: Record<string, IndustryData[]> = {}
                
                res.forEach((item: IndustryData) => {
                    const parts = item.name.split(' - ')
                    const sectorName = parts.length > 1 ? parts[0] : 'Other'
                    const industryName = parts.length > 1 ? parts[1] : item.name
                    
                    if (!grouped[sectorName]) grouped[sectorName] = []
                    grouped[sectorName].push({ ...item, name: industryName })
                })
                setOverviewSectors(grouped)
            } finally { setIsLoading(false) }
        }
        loadData()
    }, [settings.showOnlyPreferred, settings.preferredMarkets])

    const overviewColumns = [
        {
            header: "Industry",
            accessorKey: "name",
            cell: (item: IndustryData) => <span className="font-bold text-xs text-primary group-hover:underline cursor-pointer">{item.name}</span>,
            className: "w-[300px]"
        },
        {
            header: "1D Perf",
            accessorKey: "perf_1d",
            cell: (item: IndustryData) => {
                const val = item.perf_1d || 0
                return (
                    <span className={cn(
                        "font-mono text-xs font-black",
                        val > 0 ? "text-emerald-500" : val < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                        {val > 0 ? "+" : ""}{val.toFixed(2)}%
                    </span>
                )
            },
            className: "text-right"
        },
        {
            header: "Market Cap",
            accessorKey: "market_cap",
            cell: (item: IndustryData) => {
                const val = item.market_cap || 0
                return (
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">
                        {val > 0 ? `$${(val / 1e9).toFixed(1)}B` : "-"}
                    </span>
                )
            },
            className: "text-right"
        },
        {
            header: "# Stocks",
            accessorKey: "count",
            cell: (item: IndustryData) => <span className="font-mono text-xs text-muted-foreground">{item.count}</span>,
            className: "text-right"
        }
    ]

    return (
        <div className="flex flex-col space-y-8 pb-20">
            {/* Intro Box */}
            <div className="flex items-center gap-4 p-6 border border-border/40 rounded-xl bg-card/10">
                <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconChartPie className="size-8 text-primary" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Market Structure</h3>
                    <p className="text-sm text-muted-foreground">
                        Quant Science categorizes the {settings.showOnlyPreferred ? "your preferred" : "global"} equity market into <strong className="text-primary">{Object.keys(overviewSectors).length} Sectors</strong> and <strong className="text-primary">160+ Industries</strong>.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-xl" />)}
                </div>
            ) : (
                Object.entries(overviewSectors).sort((a, b) => a[0].localeCompare(b[0])).map(([sectorName, industries]) => (
                    <div key={sectorName} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <h2 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                                {sectorName}
                                <span className="text-xs text-muted-foreground font-normal normal-case tracking-normal">({industries.length} Industries)</span>
                            </h2>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                                router.push(`/dashboard/market/industry/${encodeURIComponent(sectorName)}`)
                            }}>
                                View Sector <IconArrowRight className="size-3 ml-1" />
                            </Button>
                        </div>
                        <div className="border border-border/40 rounded-lg overflow-hidden bg-card/20 shadow-sm">
                            <CompactGrid 
                                data={industries} 
                                columns={overviewColumns} 
                                isLoading={false}
                                onRowClick={(item) => {
                                    const fullCategory = sectorName === 'Other' ? item.name : `${sectorName} - ${item.name}`
                                    router.push(`/dashboard/market/industry/${encodeURIComponent(fullCategory)}`)
                                }}
                            />
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}