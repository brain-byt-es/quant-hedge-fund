"use client"

import { useState, useEffect } from "react"
import { CompactGrid } from "@/components/market-hub/compact-grid"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { 
    IconActivity, 
    IconStar, 
    IconRefresh,
    IconTrendingUp,
    IconTrendingDown,
    IconTarget
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface AnalystFlow {
  analystName: string
  analystScore: number
  symbol: string
  name: string
  action: string
  rating_current: string
  adjusted_pt_current: number
  upside: number
  date: string
  changesPercentage?: number
  change_percent?: number
}

export default function AnalystFlowPage() {
    const [ratings, setRatings] = useState<AnalystFlow[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchFlow = async () => {
        setIsLoading(true)
        try {
            // Simulated dummy data based on reference structure
            const dummyData: AnalystFlow[] = [
                { analystName: "Quinn Bolton", analystScore: 4.8, symbol: "NVDA", name: "NVIDIA Corp", action: "Reiterates", rating_current: "Buy", adjusted_pt_current: 850, upside: 24.5, date: "2026-02-03" },
                { analystName: "Rick Schafer", analystScore: 4.7, symbol: "AMD", name: "Advanced Micro Devices", action: "Upgrades", rating_current: "Strong Buy", adjusted_pt_current: 220, upside: 18.2, date: "2026-02-02" },
                { analystName: "Vivek Arya", analystScore: 4.5, symbol: "MRVL", name: "Marvell Technology", action: "Maintains", rating_current: "Buy", adjusted_pt_current: 95, upside: 15.8, date: "2026-02-02" },
                { analystName: "Ross Seymore", analystScore: 4.5, symbol: "INTC", name: "Intel Corp", action: "Downgrades", rating_current: "Hold", adjusted_pt_current: 35, upside: -5.2, date: "2026-02-01" },
                { analystName: "Timothy Arcuri", analystScore: 4.6, symbol: "TSMC", name: "Taiwan Semi", action: "Reiterates", rating_current: "Buy", adjusted_pt_current: 160, upside: 12.4, date: "2026-02-01" },
            ]
            setRatings(dummyData)
        } catch (err) {
            toast.error("Failed to fetch analyst flow")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchFlow()
    }, [])

    const columns = [
        {
            header: "Rank",
            accessorKey: "analystScore",
            cell: (item: AnalystFlow) => (
                <div className="flex items-center gap-1">
                    <span className="font-mono text-xs font-black">{item.analystScore.toFixed(1)}</span>
                    <IconStar className="size-2.5 text-amber-400 fill-amber-400" />
                </div>
            ),
            className: "w-[70px]"
        },
        {
            header: "Analyst",
            accessorKey: "analystName",
            cell: (item: AnalystFlow) => (
                <span className="text-xs font-bold truncate max-w-[120px] block">{item.analystName}</span>
            )
        },
        {
            header: "Symbol",
            accessorKey: "symbol",
            className: "w-[80px]"
        },
        {
            header: "Action",
            accessorKey: "action",
            cell: (item: AnalystFlow) => {
                const action = item.action.toLowerCase()
                const isPositive = action.includes("upgrade") || action.includes("buy") || action.includes("reiterate")
                return (
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-tighter",
                            isPositive ? "text-green-500" : "text-amber-500"
                        )}>{item.action}</span>
                        <span className="text-[9px] text-muted-foreground font-bold">{item.rating_current}</span>
                    </div>
                )
            }
        },
        {
            header: "Target",
            accessorKey: "adjusted_pt_current",
            cell: (item: AnalystFlow) => (
                <div className="flex items-center gap-1 font-mono text-xs font-black">
                    <IconTarget className="size-3 text-primary" />
                    ${item.adjusted_pt_current}
                </div>
            )
        },
        {
            header: "Upside",
            accessorKey: "upside",
            cell: (item: AnalystFlow) => (
                <span className={cn(
                    "font-mono text-xs font-black",
                    item.upside > 0 ? "text-green-500" : "text-red-500"
                )}>
                    {item.upside > 0 ? "+" : ""}{item.upside}%
                </span>
            )
        },
        {
            header: "Date",
            accessorKey: "date",
            cell: (item: AnalystFlow) => (
                <span className="text-[10px] text-muted-foreground font-medium uppercase">
                    {format(new Date(item.date), "MMM dd")}
                </span>
            )
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconActivity className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Analyst Live Flow</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Real-time feed of Wall Street ratings and price targets
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchFlow}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Refresh Flow
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latest Rating Activity</span>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">REAL-TIME STREAM</Badge>
                    </div>
                    <CompactGrid 
                        data={ratings} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </div>
        </div>
    )
}