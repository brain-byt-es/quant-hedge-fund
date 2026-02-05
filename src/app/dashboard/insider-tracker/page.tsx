"use client"

import { useEffect, useState } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
    IconUserShield, 
    IconArrowUpRight, 
    IconArrowDownLeft,
    IconExternalLink,
    IconRefresh
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface InsiderTrade {
  symbol: string
  transactionDate: string
  reportingName: string
  typeOfOwner: string
  transactionType: string
  securitiesTransacted: number
  price: number
  link: string
  changesPercentage?: number
  change_percent?: number
}

export default function InsiderTrackerPage() {
    const [trades, setTrades] = useState<InsiderTrade[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchTrades = async () => {
        setIsLoading(true)
        try {
            const data = await api.getInsiderTrades(50)
            setTrades(data || [])
        } catch (err) {
            toast.error("Failed to fetch insider trades")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchTrades()
    }, [])

    const columns = [
        {
            header: "Symbol",
            accessorKey: "symbol",
            className: "w-[100px]",
            sortable: true
        },
        {
            header: "Reporting Name",
            accessorKey: "reportingName",
            cell: (item: InsiderTrade) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold truncate max-w-[200px]">{item.reportingName}</span>
                    <span className="text-[9px] text-muted-foreground uppercase">{item.typeOfOwner}</span>
                </div>
            ),
            sortable: true
        },
        {
            header: "Type",
            accessorKey: "transactionType",
            cell: (item: InsiderTrade) => {
                const isBuy = item.transactionType.toLowerCase().includes("purchase") || item.transactionType.toLowerCase().includes("buy")
                const isSell = item.transactionType.toLowerCase().includes("sale") || item.transactionType.toLowerCase().includes("sell")
                
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
                        {item.transactionType.split("-")[0].trim()}
                    </Badge>
                )
            },
            sortable: true
        },
        {
            header: "Shares",
            accessorKey: "securitiesTransacted",
            cell: (item: InsiderTrade) => (
                <span className="font-mono text-xs font-bold">
                    {item.securitiesTransacted.toLocaleString()}
                </span>
            ),
            sortable: true
        },
        {
            header: "Price",
            accessorKey: "price",
            cell: (item: InsiderTrade) => (
                <span className="font-mono text-xs font-bold">
                    ${item.price?.toFixed(2) || "0.00"}
                </span>
            ),
            sortable: true
        },
        {
            header: "Value",
            accessorKey: "value",
            cell: (item: InsiderTrade) => {
                const value = item.securitiesTransacted * item.price
                return (
                    <span className={cn(
                        "font-mono text-xs font-black",
                        value > 1000000 ? "text-primary underline decoration-primary/30" : ""
                    )}>
                        ${(value / 1000).toFixed(1)}K
                    </span>
                )
            },
            sortable: true
        },
        {
            header: "Date",
            accessorKey: "transactionDate",
            cell: (item: InsiderTrade) => (
                <span className="text-[10px] text-muted-foreground font-mono">
                    {item.transactionDate ? format(new Date(item.transactionDate), "MMM dd") : "---"}
                </span>
            ),
            sortable: true
        },
        {
            header: "SEC",
            accessorKey: "link",
            cell: (item: InsiderTrade) => (
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
                        <IconUserShield className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Insider Tracker</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Monitoring SEC Form 4 Filings in Real-Time
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
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Market Activity</span>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">{trades.length} RECENT TRADES</Badge>
                    </div>
                    <PaginatedTable 
                        data={trades} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </div>
        </div>
    )
}
