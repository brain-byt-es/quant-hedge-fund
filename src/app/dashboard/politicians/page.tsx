"use client"

import { useEffect, useState } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
    IconBuildingMonument, 
    IconArrowUpRight, 
    IconArrowDownLeft,
    IconExternalLink,
    IconRefresh
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface PoliticianTrade {
  symbol: string
  transactionDate: string
  representative: string
  house: string
  type: string
  amount: string
  link: string
  firstName?: string
  lastName?: string
  changesPercentage?: number
  change_percent?: number
}

import { useMemo } from "react"
import { useRouter } from "next/navigation"

export default function PoliticiansPage() {
    const router = useRouter()
    const [trades, setTrades] = useState<PoliticianTrade[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

    const fetchTrades = async () => {
        setIsLoading(true)
        try {
            const data = await api.getPoliticianTrades(100)
            setTrades(data || [])
        } catch (err) {
            toast.error("Failed to fetch politician trades")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchTrades()
    }, [])

    const sortedTrades = useMemo(() => {
        if (!sortConfig) return trades
        return [...trades].sort((a, b) => {
            const valA = (a as unknown as Record<string, unknown>)[sortConfig.key]?.toString().toLowerCase() || ""
            const valB = (b as unknown as Record<string, unknown>)[sortConfig.key]?.toString().toLowerCase() || ""
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
    }, [trades, sortConfig])

    const handleRowClick = (item: PoliticianTrade) => {
        const name = item.representative || `${item.firstName} ${item.lastName}`
        router.push(`/dashboard/politicians/profile?name=${encodeURIComponent(name)}`)
    }

    const columns = [
        {
            header: "Symbol",
            accessorKey: "symbol",
            className: "w-[100px]",
        },
        {
            header: "Representative",
            accessorKey: "representative",
            cell: (item: PoliticianTrade) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold truncate max-w-[200px]">{item.representative || `${item.firstName} ${item.lastName}`}</span>
                    <span className="text-[9px] text-muted-foreground uppercase">{item.house}</span>
                </div>
            )
        },
        {
            header: "Type",
            accessorKey: "type",
            cell: (item: PoliticianTrade) => {
                const type = item.type.toLowerCase()
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
            }
        },
        {
            header: "Amount Range",
            accessorKey: "amount",
            cell: (item: PoliticianTrade) => (
                <span className="font-mono text-xs font-bold text-primary">
                    {item.amount}
                </span>
            )
        },
        {
            header: "Date",
            accessorKey: "transactionDate",
            cell: (item: PoliticianTrade) => (
                <span className="text-[10px] text-muted-foreground font-mono">
                    {item.transactionDate ? format(new Date(item.transactionDate), "MMM dd, yyyy") : "---"}
                </span>
            )
        },
        {
            header: "Link",
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

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconBuildingMonument className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Capitol Trades</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Monitoring Congressional Financial Disclosures
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchTrades}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Refresh Feed
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <span 
                                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setSortConfig({ key: 'representative', direction: sortConfig?.direction === 'asc' ? 'desc' : 'asc' })}
                            >
                                Representative {sortConfig?.key === 'representative' && (sortConfig.direction === 'asc' ? "↑" : "↓")}
                            </span>
                        </div>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">{trades.length} RECENT FILINGS</Badge>
                    </div>
                    <PaginatedTable 
                        data={sortedTrades} 
                        columns={columns} 
                        isLoading={isLoading} 
                        onRowClick={handleRowClick}
                    />
                </div>
            </div>
        </div>
    )
}
