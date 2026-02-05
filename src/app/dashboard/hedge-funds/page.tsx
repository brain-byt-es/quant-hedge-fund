"use client"

import { useEffect, useState } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
    IconBuildingBank, 
    IconRefresh,
    IconSearch
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

interface HedgeFund {
  cik: string
  name: string
  manager: string
  portfolio_value: string
  top_holdings: string[]
  strategy: string
  success_rate: string
  rank: string
  symbol?: string
  ticker?: string
  changesPercentage?: number
  change_percent?: number
}

export default function HedgeFundsPage() {
    const router = useRouter()
    const [filteredFunds, setFilteredFunds] = useState<HedgeFund[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")

    const fetchFunds = async (query?: string) => {
        setIsLoading(true)
        try {
            const data = await api.getHedgeFunds(query)
            setFilteredFunds(data || [])
        } catch (_err) {
            toast.error("Failed to fetch institutional holders")
            console.error(_err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchFunds()
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search) {
                fetchFunds(search)
            } else {
                fetchFunds()
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    const handleRowClick = (item: HedgeFund) => {
        router.push(`/dashboard/hedge-funds/profile?cik=${item.cik}`)
    }

    const columns = [
        {
            header: "Rank",
            accessorKey: "rank",
            cell: (item: HedgeFund) => (
                <span className="font-black font-mono text-[10px] opacity-50">{item.rank}</span>
            ),
            className: "w-[60px]",
            sortable: true
        },
        {
            header: "Fund / Manager",
            accessorKey: "name",
            cell: (item: HedgeFund) => (
                <div className="flex flex-col">
                    <span className="text-xs font-black group-hover:text-primary transition-colors">{item.name}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">{item.manager}</span>
                </div>
            ),
            sortable: true
        },
        {
            header: "AUM (Est)",
            accessorKey: "portfolio_value",
            cell: (item: HedgeFund) => (
                <span className="font-mono text-xs font-black text-primary">{item.portfolio_value}</span>
            ),
            sortable: true
        },
        {
            header: "Strategy",
            accessorKey: "strategy",
            cell: (item: HedgeFund) => (
                <Badge variant="outline" className="text-[9px] font-black uppercase border-border/50 bg-muted/20 h-5">
                    {item.strategy}
                </Badge>
            ),
            sortable: true
        },
        {
            header: "Top Holdings",
            accessorKey: "top_holdings",
            cell: (item: HedgeFund) => (
                <div className="flex gap-1.5">
                    {item.top_holdings.map((h) => (
                        <Badge key={h} variant="secondary" className="text-[8px] font-mono h-4 px-1">
                            {h}
                        </Badge>
                    ))}
                </div>
            )
        },
        {
            header: "Score",
            accessorKey: "success_rate",
            cell: (item: HedgeFund) => (
                <span className="text-[10px] font-black text-emerald-500">{item.success_rate}</span>
            ),
            sortable: true
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconBuildingBank className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Institutional Directory</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Tracking 13F Filers and Hedge Fund Activity
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input 
                            placeholder="Search Institution..." 
                            className="h-9 pl-9 text-[11px] font-bold uppercase tracking-widest bg-muted/20 border-border/50 rounded-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={() => fetchFunds()}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Update List
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Hedge Funds & Asset Managers</span>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">{filteredFunds.length} ENTITIES</Badge>
                    </div>
                    <PaginatedTable 
                        data={filteredFunds} 
                        columns={columns} 
                        isLoading={isLoading}
                        onRowClick={handleRowClick}
                    />
                </div>
            </div>
        </div>
    )
}
