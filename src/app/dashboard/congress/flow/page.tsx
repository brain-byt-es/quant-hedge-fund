"use client"

import { useEffect, useState } from "react"
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
    IconScale
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface CongressTrade {
  symbol: string
  ticker: string
  representative: string
  party: string
  disclosureDate: string
  transactionDate: string
  amount: string
  type: string
  assetDescription: string
  link: string
  changesPercentage?: number
  change_percent?: number
}

export default function CongressFlowPage() {
    const [trades, setTrades] = useState<CongressTrade[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchTrades = async () => {
        setIsLoading(true)
        try {
            const data = await api.getCongressFlow(100)
            setTrades(data || [])
        } catch (err) {
            toast.error("Failed to fetch congress flow")
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
            cell: (item: CongressTrade) => (
                <span className="font-black font-mono text-sm group-hover:text-primary transition-colors">
                    {item.symbol || item.ticker}
                </span>
            ),
            className: "w-[100px]",
        },
        {
            header: "Representative",
            accessorKey: "representative",
            cell: (item: CongressTrade) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold truncate max-w-[180px] block">{item.representative}</span>
                    <Badge variant="outline" className={cn(
                        "w-fit h-3.5 text-[8px] font-bold uppercase mt-0.5 border-none",
                        item.party?.includes("Democrat") ? "bg-blue-500/10 text-blue-500" : 
                        item.party?.includes("Republican") ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                    )}>
                        {item.party || "Unknown"}
                    </Badge>
                </div>
            )
        },
        {
            header: "Action",
            accessorKey: "type",
            cell: (item: CongressTrade) => {
                const isBuy = item.type?.toLowerCase().includes("purchase") || item.type?.toLowerCase().includes("buy")
                const isSell = item.type?.toLowerCase().includes("sale") || item.type?.toLowerCase().includes("sell")
                
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
            cell: (item: CongressTrade) => (
                <span className="font-mono text-[10px] font-bold text-primary">
                    {item.amount?.replace("$1,000,001 - $5,000,000", "$1M - $5M")}
                </span>
            )
        },
        {
            header: "Filing Date",
            accessorKey: "disclosureDate",
            cell: (item: CongressTrade) => (
                <span className="text-[10px] text-muted-foreground font-mono">
                    {item.disclosureDate ? format(new Date(item.disclosureDate), "MMM dd, yyyy") : "---"}
                </span>
            )
        },
        {
            header: "Source",
            accessorKey: "link",
            cell: (item: CongressTrade) => (
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
                        <IconScale className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Congress Flow</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Monitoring Capitol Hill Trading Patterns & Ethics Disclosures
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchTrades}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Refresh Flow
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <IconBuildingMonument className="size-3 text-muted-foreground" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Political Transactions</span>
                        </div>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">{trades.length} RECENT FILINGS</Badge>
                    </div>
                    <CompactGrid 
                        data={trades} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </div>
        </div>
    )
}