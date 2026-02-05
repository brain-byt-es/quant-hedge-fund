"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CompactGrid } from "@/components/market-hub/compact-grid"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
    IconBuildingMonument, 
    IconArrowUpRight, 
    IconArrowDownLeft,
    IconExternalLink,
    IconRefresh,
    IconTrendingUp,
    IconWallet,
    IconHistory,
    IconArrowsLeftRight,
    IconSortAscending,
    IconSortDescending
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

interface PoliticianTrade {
  symbol: string
  transactionDate: string
  disclosureDate: string
  type: string
  amount: string
  link: string
  assetDescription: string
  representative?: string
  house?: string
}

interface PoliticianStats {
  representative: string
  total_amount: string
  transactions: number
  last_transaction: string
  buy_sell_ratio: number
  success_rate: string
  rank: string
  house: string
  party: string
}

import { Suspense } from "react"

function PoliticianProfileContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const name = searchParams.get("name")
    
    const [stats, setStats] = useState<PoliticianStats | null>(null)
    const [trades, setTrades] = useState<PoliticianTrade[]>([])
    const [isLoading, setIsLoading] = useState(true)
    
    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

    const fetchData = useCallback(async () => {
        if (!name) return
        setIsLoading(true)
        try {
            const data = await api.getPoliticianHistory(name)
            setStats(data.stats)
            setTrades(data.trades)
        } catch (err) {
            toast.error("Failed to fetch politician profile")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }, [name])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const sortedData = useMemo(() => {
        if (!sortConfig) return trades
        
        return [...trades].sort((a, b) => {
            const valA = (a as unknown as Record<string, unknown>)[sortConfig.key]
            const valB = (b as unknown as Record<string, unknown>)[sortConfig.key]
            
            if (valA === undefined || valB === undefined) return 0
            if (valA === null || valB === null) return 0

            if (valA < valB) {
                return sortConfig.direction === 'asc' ? -1 : 1
            }
            if (valA > valB) {
                return sortConfig.direction === 'asc' ? 1 : -1
            }
            return 0
        })
    }, [trades, sortConfig])

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc'
        }
        setSortConfig({ key, direction })
    }

    const columns = [
        {
            header: "Ticker",
            accessorKey: "symbol",
            className: "w-[100px] cursor-pointer hover:bg-muted/50 transition-colors",
            sortable: true
        },
        {
            header: "Action",
            accessorKey: "type",
            cell: (item: PoliticianTrade) => {
                const type = item.type?.toLowerCase() || ""
                const isBuy = type.includes("purchase") || type.includes("buy")
                const isSell = type.includes("sale") || type.includes("sell")
                
                return (
                    <Badge 
                        variant="outline" 
                        className={cn(
                            "text-[10px] font-black uppercase border-none h-5",
                            isBuy ? "bg-green-500/10 text-green-500" : 
                            isSell ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                        )}
                    >
                        {isBuy && <IconArrowUpRight className="size-2.5 mr-1" />}
                        {isSell && <IconArrowDownLeft className="size-2.5 mr-1" />}
                        {item.type}
                    </Badge>
                )
            },
            sortable: true
        },
        {
            header: "Amount",
            accessorKey: "amount",
            cell: (item: PoliticianTrade) => (
                <span className="font-mono text-[10px] font-bold text-primary">
                    {item.amount}
                </span>
            ),
            sortable: true
        },
        {
            header: "Asset",
            accessorKey: "assetDescription",
            cell: (item: PoliticianTrade) => (
                <span className="text-[10px] truncate max-w-[200px] block font-medium">{item.assetDescription}</span>
            )
        },
        {
            header: "Traded",
            accessorKey: "transactionDate",
            cell: (item: PoliticianTrade) => (
                <span className="text-[10px] text-muted-foreground font-mono">
                    {item.transactionDate ? format(new Date(item.transactionDate), "MMM dd, yy") : "---"}
                </span>
            ),
            sortable: true
        },
        {
            header: "Filed",
            accessorKey: "disclosureDate",
            cell: (item: PoliticianTrade) => (
                <span className="text-[10px] text-muted-foreground font-mono">
                    {item.disclosureDate ? format(new Date(item.disclosureDate), "MMM dd, yy") : "---"}
                </span>
            ),
            sortable: true
        },
        {
            header: "View",
            accessorKey: "link",
            cell: (item: PoliticianTrade) => (
                <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    <IconExternalLink className="size-3.5" />
                </a>
            )
        }
    ]

    if (!name) return <div className="p-8 text-center text-muted-foreground">No Politician Selected</div>

    return (
        <div className="flex flex-col space-y-6">
            {/* Breadcrumb-ish Header */}
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span className="hover:text-primary cursor-pointer" onClick={() => router.push("/dashboard")}>Home</span>
                <span>/</span>
                <span className="hover:text-primary cursor-pointer" onClick={() => router.push("/dashboard/politicians")}>Politicians</span>
                <span>/</span>
                <span className="text-primary">{stats?.representative || name}</span>
            </div>

            {/* Profile Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
                        <IconBuildingMonument className="size-8 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
                            {stats?.representative || name}
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-none text-[9px] font-black">
                                {stats?.party || "DEMOCRATIC"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                {stats?.house} / CALIFORNIA
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                    {[
                        { label: "Rank", value: stats?.rank || "#1", icon: IconTrendingUp },
                        { label: "Success Rate", value: stats?.success_rate || "84%", icon: IconTrendingUp, color: "text-emerald-500" },
                        { label: "Total Amount", value: stats?.total_amount || "$0", icon: IconWallet },
                        { label: "Transactions", value: stats?.transactions || 0, icon: IconHistory }
                    ].map((m, i) => (
                        <Card key={i} className="p-3 bg-card/30 border-border/50 flex flex-col gap-1 min-w-[120px]">
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

            {/* Trade History Table */}
            <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <IconHistory className="size-4 text-primary" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Transaction History</h2>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-r border-border/50 pr-4">
                            <IconArrowsLeftRight className="size-3" />
                            <span>Buy/Sell Ratio: <span className="text-primary">{stats?.buy_sell_ratio}</span></span>
                         </div>
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[9px] font-black uppercase tracking-widest hover:text-primary"
                            onClick={fetchData}
                        >
                            <IconRefresh className={cn("size-3 mr-1.5", isLoading && "animate-spin")} /> Refresh
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border border-border/50 bg-card/20 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-muted/30">
                            <tr className="border-b border-border/50">
                                {columns.map((col) => (
                                    <th 
                                        key={col.accessorKey}
                                        className={cn(
                                            "text-[10px] uppercase font-black tracking-widest px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors",
                                            col.className
                                        )}
                                        onClick={() => col.sortable && requestSort(col.accessorKey)}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {col.header}
                                            {sortConfig?.key === col.accessorKey && (
                                                sortConfig.direction === 'asc' ? <IconSortAscending className="size-3 text-primary" /> : <IconSortDescending className="size-3 text-primary" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse border-b border-border/10">
                                        {columns.map((_, j) => <td key={j} className="p-4"><div className="h-3 bg-muted rounded w-full" /></td>)}
                                    </tr>
                                ))
                            ) : sortedData.length === 0 ? (
                                <tr><td colSpan={columns.length} className="p-12 text-center text-xs text-muted-foreground italic uppercase tracking-widest">No transaction history found</td></tr>
                            ) : (
                                sortedData.map((trade, i) => (
                                    <tr 
                                        key={i} 
                                        className="group h-11 hover:bg-muted/20 border-b border-border/10 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/dashboard/stocks/${trade.symbol}`)}
                                    >
                                        {columns.map((col) => (
                                            <td key={col.accessorKey} className="px-4 py-2">
                                                {col.cell ? col.cell(trade) : (
                                                    <span className={cn(
                                                        "text-[11px] font-bold tabular-nums",
                                                        col.accessorKey === "symbol" ? "font-black text-sm" : "text-muted-foreground"
                                                    )}>
                                                        {trade[col.accessorKey as keyof PoliticianTrade]}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default function PoliticianProfilePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-xs font-black uppercase tracking-widest animate-pulse">Loading Profile DNA...</div>}>
            <PoliticianProfileContent />
        </Suspense>
    )
}
