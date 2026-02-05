"use client"

import { useEffect, useState } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
    IconWorld, 
    IconRefresh,
    IconActivity,
    IconAlertTriangle
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface EconomicEvent {
  event: string
  date: string
  country: string
  actual?: number
  previous?: number
  estimate?: number
  impact?: string
  changesPercentage?: number
  change_percent?: number
}

export default function EconomicCalendarPage() {
    const [events, setEvents] = useState<EconomicEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchEvents = async () => {
        setIsLoading(true)
        try {
            const data = await api.getEconomicCalendar()
            setEvents(data || [])
        } catch {
            toast.error("Failed to fetch economic calendar")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchEvents()
    }, [])

    const columns = [
        {
            header: "Time",
            accessorKey: "date",
            cell: (item: EconomicEvent) => (
                <span className="text-[10px] font-mono font-bold text-primary">
                    {format(new Date(item.date), "MMM dd, HH:mm")}
                </span>
            ),
            className: "w-[120px]",
            sortable: true
        },
        {
            header: "Event",
            accessorKey: "event",
            cell: (item: EconomicEvent) => (
                <div className="flex flex-col">
                    <span className="text-xs font-black truncate max-w-[250px] block">{item.event}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">{item.country}</span>
                </div>
            ),
            sortable: true
        },
        {
            header: "Impact",
            accessorKey: "impact",
            cell: (item: EconomicEvent) => {
                const impact = item.impact?.toLowerCase()
                const isHigh = impact?.includes("high")
                return (
                    <Badge variant="outline" className={cn(
                        "text-[9px] font-black uppercase border-none h-5",
                        isHigh ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                    )}>
                        {isHigh && <IconAlertTriangle className="size-2.5 mr-1" />}
                        {item.impact || "MEDIUM"}
                    </Badge>
                )
            },
            sortable: true
        },
        {
            header: "Actual",
            accessorKey: "actual",
            cell: (item: EconomicEvent) => <span className="font-mono text-xs font-bold">{item.actual || "---"}</span>,
            sortable: true
        },
        {
            header: "Consensus",
            accessorKey: "estimate",
            cell: (item: EconomicEvent) => <span className="font-mono text-xs text-muted-foreground">{item.estimate || "---"}</span>,
            sortable: true
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconWorld className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Macro Intelligence</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Global Economic Indicators & Central Bank Catalysts
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchEvents}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <IconActivity className="size-3 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Economic Action Calendar</span>
                        </div>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">{events.length} MACRO EVENTS</Badge>
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
