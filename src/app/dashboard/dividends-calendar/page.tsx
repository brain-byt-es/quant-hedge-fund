"use client"

import { useEffect, useState } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
    IconCurrencyDollar, 
    IconRefresh,
    IconCalendarStats
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface DividendItem {
  symbol: string
  date: string
  dividend: number
  recordDate: string
  paymentDate: string
  declarationDate: string
  changesPercentage?: number
  change_percent?: number
}

export default function DividendsCalendarPage() {
    const [events, setEvents] = useState<DividendItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchDividends = async () => {
        setIsLoading(true)
        try {
            const data = await api.getDividendsCalendar()
            setEvents(data || [])
        } catch (err) {
            toast.error("Failed to fetch dividends calendar")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchDividends()
    }, [])

    const columns = [
        {
            header: "Ex-Date",
            accessorKey: "date",
            cell: (item: DividendItem) => (
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
            header: "Dividend",
            accessorKey: "dividend",
            cell: (item: DividendItem) => (
                <div className="flex items-center gap-1 font-mono text-xs font-black text-green-500">
                    <IconCurrencyDollar className="size-3" />
                    {item.dividend?.toFixed(3)}
                </div>
            ),
            sortable: true
        },
        {
            header: "Payment Date",
            accessorKey: "paymentDate",
            cell: (item: DividendItem) => (
                <span className="text-[10px] text-muted-foreground font-mono">
                    {item.paymentDate ? format(new Date(item.paymentDate), "MMM dd") : "---"}
                </span>
            ),
            sortable: true
        },
        {
            header: "Declaration",
            accessorKey: "declarationDate",
            cell: (item: DividendItem) => (
                <span className="text-[10px] text-muted-foreground font-mono opacity-50">
                    {item.declarationDate ? format(new Date(item.declarationDate), "MMM dd") : "---"}
                </span>
            )
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconCalendarStats className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Dividends Calendar</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Tracking Yield Payouts & Corporate Distributions
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchDividends}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Update
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Corporate Actions Feed</span>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">{events.length} PAYOUTS TRACKED</Badge>
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
