"use client"

import { useEffect, useState } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
    IconCalendarEvent, 
    IconRefresh,
    IconTrendingUp,
    IconMessageCircle
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface EarningsItem {
  symbol: string
  date: string
  eps?: number
  epsEstimated?: number
  time: string
  revenue?: number
  revenueEstimated?: number
  changesPercentage?: number
  change_percent?: number
}

export default function EarningsCalendarPage() {
    const [events, setEvents] = useState<EarningsItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchEarnings = async () => {
        setIsLoading(true)
        try {
            const data = await api.getEarningsCalendar()
            setEvents(data || [])
        } catch (err) {
            toast.error("Failed to fetch earnings calendar")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchEarnings()
    }, [])

    const columns = [
        {
            header: "Date",
            accessorKey: "date",
            cell: (item: EarningsItem) => (
                <span className="text-[10px] font-mono font-bold text-primary">
                    {format(new Date(item.date), "MMM dd, yyyy")}
                </span>
            ),
            className: "w-[120px]",
            sortable: true
        },
        {
            header: "Symbol",
            accessorKey: "symbol",
            className: "w-[100px]",
            sortable: true
        },
        {
            header: "Release Time",
            accessorKey: "time",
            cell: (item: EarningsItem) => (
                <Badge variant="outline" className="text-[9px] font-black uppercase border-border/50 bg-muted/20 h-5">
                    {item.time?.toUpperCase()}
                </Badge>
            ),
            sortable: true
        },
        {
            header: "EPS Est.",
            accessorKey: "epsEstimated",
            cell: (item: EarningsItem) => (
                <span className="font-mono text-xs font-bold">
                    {item.epsEstimated?.toFixed(2) || "---"}
                </span>
            ),
            sortable: true
        },
        {
            header: "Revenue Est.",
            accessorKey: "revenueEstimated",
            cell: (item: EarningsItem) => (
                <span className="font-mono text-xs font-bold text-muted-foreground">
                    {item.revenueEstimated ? `$${(item.revenueEstimated / 1e9).toFixed(2)}B` : "---"}
                </span>
            ),
            sortable: true
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconCalendarEvent className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Earnings Calendar</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Monitoring Quarterly Results & Market Reactions
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchEarnings}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Update
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upcoming Reports</span>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">{events.length} REPORTS LISTED</Badge>
                    </div>
                    <PaginatedTable 
                        data={events} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </div>
        </div>
    )
}
