"use client"

import { useEffect, useState } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
    IconRocket, 
    IconCalendar,
    IconRefresh
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface IPOItem {
  symbol: string
  company: string
  date: string
  price: number
  priceRange?: string
  exchange: string
  actions?: string
}

export default function IPOCalendarPage() {
    const [ipos, setIpos] = useState<IPOItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchIPOs = async () => {
        setIsLoading(true)
        try {
            const data = await api.getIPOCalendar()
            // Map FMP keys to our interface
            const mapped = (data || []).map((item: Record<string, unknown>) => ({
                symbol: (item.symbol as string) || "---",
                company: (item.company as string) || (item.name as string) || "---",
                date: (item.date as string) || "---",
                price: (item.price as number) || 0,
                priceRange: (item.priceRange as string) || "---",
                exchange: (item.exchange as string) || "---"
            }))
            setIpos(mapped)
        } catch (_err) {
            toast.error("Failed to fetch IPO calendar")
            console.error(_err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchIPOs()
    }, [])

    const columns = [
        {
            header: "Date",
            accessorKey: "date",
            cell: (item: IPOItem) => (
                <span className="text-[10px] font-mono font-bold text-primary">
                    {item.date !== "---" ? format(new Date(item.date), "MMM dd, yyyy") : "TBA"}
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
            header: "Company",
            accessorKey: "company",
            cell: (item: IPOItem) => (
                <span className="text-xs font-black truncate max-w-[250px] block">{item.company}</span>
            ),
            sortable: true
        },
        {
            header: "Price Range",
            accessorKey: "priceRange",
            cell: (item: IPOItem) => (
                <span className="font-mono text-xs font-bold text-muted-foreground">
                    {item.priceRange !== "---" ? item.priceRange : (item.price > 0 ? `$${item.price}` : "TBA")}
                </span>
            ),
            sortable: true
        },
        {
            header: "Exchange",
            accessorKey: "exchange",
            cell: (item: IPOItem) => (
                <Badge variant="outline" className="text-[9px] font-black uppercase border-border/50 bg-muted/20 h-5">
                    {item.exchange}
                </Badge>
            ),
            sortable: true
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconRocket className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">IPO Calendar</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Tracking Upcoming and Recent Public Offerings
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchIPOs}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Refresh Calendar
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <IconCalendar className="size-3 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Market Entry Schedule</span>
                        </div>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">{ipos.length} EVENTS TRACKED</Badge>
                    </div>
                    <PaginatedTable 
                        data={ipos} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </div>
        </div>
    )
}