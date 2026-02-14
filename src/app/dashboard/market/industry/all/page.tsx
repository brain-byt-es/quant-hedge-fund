"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface IndustryData {
    name: string
    count: number
    market_cap?: number
    total_revenue?: number
    perf_1d?: number
    perf_1y?: number
    avg_dividend_yield?: number
    pe_ratio?: number
    // Compat
    symbol?: string
    ticker?: string
    changesPercentage?: number
    change_percent?: number
}

const abbreviateNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || num === 0) return "-"
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T"
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B"
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M"
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K"
    return num.toFixed(2)
}

const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null || num === 0) return "-"
    return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`
}

const getColor = (num: number | undefined | null) => {
    if (!num) return "text-muted-foreground"
    return num > 0 ? "text-emerald-500 font-bold" : "text-red-500 font-bold"
}

export default function IndustryAllPage() {
    const router = useRouter()
    const [data, setData] = useState<IndustryData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                // Fetch All Industries (Granular)
                const res = await api.getSectors(500, 'industry')
                setData(res)
            } finally { setIsLoading(false) }
        }
        loadData()
    }, [])

    const columns = [
        {
            header: "Industry Name",
            accessorKey: "name",
            cell: (item: IndustryData) => (
                <span className="font-bold text-xs text-primary group-hover:underline cursor-pointer">{item.name}</span>
            ),
            sortable: true,
            className: "w-[300px]"
        },
        {
            header: "# Stocks",
            accessorKey: "count",
            cell: (item: IndustryData) => <Badge variant="secondary" className="font-mono text-[10px] h-5">{item.count}</Badge>,
            sortable: true,
            className: "text-right"
        },
        {
            header: "Market Cap",
            accessorKey: "market_cap",
            cell: (item: IndustryData) => <span className="font-mono text-xs text-muted-foreground">{abbreviateNumber(item.market_cap)}</span>,
            sortable: true,
            className: "text-right"
        },
        {
            header: "Div. Yield",
            accessorKey: "avg_dividend_yield",
            cell: (item: IndustryData) => <span className="font-mono text-xs">{item.avg_dividend_yield ? item.avg_dividend_yield.toFixed(2) + '%' : '-'}</span>,
            sortable: true,
            className: "text-right"
        },
        {
            header: "PE Ratio",
            accessorKey: "pe_ratio",
            cell: (item: IndustryData) => <span className="font-mono text-xs">{item.pe_ratio ? item.pe_ratio.toFixed(2) : '-'}</span>,
            sortable: true,
            className: "text-right"
        },
        {
            header: "1D Change",
            accessorKey: "perf_1d",
            cell: (item: IndustryData) => <span className={cn("font-mono text-xs", getColor(item.perf_1d))}>{formatPercent(item.perf_1d)}</span>,
            sortable: true,
            className: "text-right"
        },
        {
            header: "1Y Change",
            accessorKey: "perf_1y",
            cell: (item: IndustryData) => <span className={cn("font-mono text-xs", getColor(item.perf_1y))}>{formatPercent(item.perf_1y)}</span>,
            sortable: true,
            className: "text-right"
        }
    ]

    return (
        <PaginatedTable 
            data={data} 
            columns={columns} 
            isLoading={isLoading} 
            onRowClick={(item) => {
                router.push(`/dashboard/market/industry/${encodeURIComponent(item.name)}`)
            }}
        />
    )
}