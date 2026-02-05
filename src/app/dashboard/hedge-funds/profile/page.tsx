"use client"

import { useEffect, useState, useMemo, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CompactGrid } from "@/components/market-hub/compact-grid"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
    IconBuildingBank, 
    IconRefresh,
    IconTrendingUp,
    IconWallet,
    IconHistory,
    IconExternalLink,
    IconLayoutGrid,
    IconArrowsLeftRight
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

interface Holding {
  symbol: string
  name: string
  shares: number
  value: number
  weight: number
  type: string
}

interface FundStats {
  name: string
  total_value: string
  as_of: string
  positions: number
  accession: string
}

function HedgeFundProfileContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const cik = searchParams.get("cik")
    
    const [stats, setStats] = useState<FundStats | null>(null)
    const [holdings, setHoldings] = useState<Holding[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchData = useCallback(async () => {
        if (!cik) return
        setIsLoading(true)
        try {
            const data = await api.getHedgeFundHoldings(cik)
            setStats(data.stats)
            setHoldings(data.holdings)
        } catch (err) {
            toast.error("Failed to fetch fund holdings")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }, [cik])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const columns = [
        {
            header: "Ticker",
            accessorKey: "symbol",
            className: "w-[100px]",
            sortable: true
        },
        {
            header: "Issuer Name",
            accessorKey: "name",
            cell: (item: Holding) => (
                <span className="text-xs font-bold truncate max-w-[250px] block">{item.name}</span>
            ),
            sortable: true
        },
        {
            header: "Weight",
            accessorKey: "weight",
            cell: (item: Holding) => (
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary" 
                            style={{ width: `${Math.min(100, item.weight * 5)}%` }} 
                        />
                    </div>
                    <span className="text-[10px] font-black font-mono">{item.weight}%</span>
                </div>
            ),
            sortable: true
        },
        {
            header: "Shares",
            accessorKey: "shares",
            cell: (item: Holding) => (
                <span className="font-mono text-[10px] text-muted-foreground">
                    {item.shares.toLocaleString()}
                </span>
            ),
            sortable: true
        },
        {
            header: "Value",
            accessorKey: "value",
            cell: (item: Holding) => (
                <span className="font-mono text-[10px] font-bold text-primary">
                    ${(item.value / 1e6).toFixed(1)}M
                </span>
            ),
            sortable: true
        },
        {
            header: "Type",
            accessorKey: "type",
            cell: (item: Holding) => (
                <Badge variant="outline" className={cn(
                    "text-[8px] font-black uppercase h-4 px-1.5",
                    item.type === "Long" ? "bg-emerald-500/10 text-emerald-500 border-none" : "bg-orange-500/10 text-orange-500 border-none"
                )}>
                    {item.type}
                </Badge>
            ),
            sortable: true
        }
    ]

    if (!cik) return <div className="p-8 text-center text-muted-foreground">No Fund Selected</div>

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span className="hover:text-primary cursor-pointer" onClick={() => router.push("/dashboard")}>Home</span>
                <span>/</span>
                <span className="hover:text-primary cursor-pointer" onClick={() => router.push("/dashboard/hedge-funds")}>Hedge Funds</span>
                <span>/</span>
                <span className="text-primary">{stats?.name || cik}</span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
                        <IconBuildingBank className="size-8 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
                            {stats?.name || "Loading..."}
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black uppercase">
                                SEC Form 13F-HR
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                CIK: {cik}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full md:w-auto">
                    {[
                        { label: "Total AUM", value: stats?.total_value || "$0", icon: IconWallet, color: "text-emerald-500" },
                        { label: "Positions", value: stats?.positions || 0, icon: IconLayoutGrid },
                        { label: "Report Date", value: stats?.as_of ? format(new Date(stats.as_of), "MMM dd, yyyy") : "N/A", icon: IconHistory }
                    ].map((m, i) => (
                        <Card key={i} className="p-3 bg-card/30 border-border/50 flex flex-col gap-1 min-w-[140px]">
                            <div className="flex items-center gap-1.5 opacity-50">
                                <m.icon className="size-3" />
                                <span className="text-[8px] font-black uppercase tracking-widest">{m.label}</span>
                            </div>
                            <span className={cn("text-sm font-black tracking-tight", m.color)}>
                                {m.value}
                            </span>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <IconHistory className="size-4 text-primary" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Portfolio Holdings Breakdown</h2>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[9px] font-black uppercase tracking-widest hover:text-primary"
                        onClick={fetchData}
                    >
                        <IconRefresh className={cn("size-3 mr-1.5", isLoading && "animate-spin")} /> Re-Sync Filing
                    </Button>
                </div>

                <CompactGrid 
                    data={holdings} 
                    columns={columns} 
                    isLoading={isLoading}
                />
            </div>
        </div>
    )
}

export default function HedgeFundProfilePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-xs font-black uppercase tracking-widest animate-pulse">Scanning SEC Archives...</div>}>
            <HedgeFundProfileContent />
        </Suspense>
    )
}
