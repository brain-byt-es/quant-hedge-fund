"use client"

import { useState, useEffect } from "react"
import { CompactGrid } from "@/components/market-hub/compact-grid"
import { Badge } from "@/components/ui/badge"
import { 
    IconRocket, 
    IconRefresh,
    IconCalendarEvent
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface NewETF {
  symbol: string
  name: string
  launchDate: string
  assetClass: string
  issuer: string
  changesPercentage?: number
  change_percent?: number
}

export default function ETFNewLaunchesPage() {
    const [launches, setLaunches] = useState<NewETF[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchLaunches = async () => {
        setIsLoading(true)
        try {
            // Simulated dummy data based on reference structure
            const dummyData: NewETF[] = [
                { symbol: "DEEP", name: "Deep Value Discovery ETF", launchDate: "2026-01-15", assetClass: "Equity: U.S. - Multi-Cap", issuer: "BlackRock", change_percent: 1.2 },
                { symbol: "AIOS", name: "AI Global OS Systems ETF", launchDate: "2026-01-10", assetClass: "Equity: Global - Tech", issuer: "Vanguard", change_percent: 4.5 },
                { symbol: "GREEN", name: "Clean Hydrogen Infrastructure ETF", launchDate: "2026-01-05", assetClass: "Equity: Global - ESG", issuer: "State Street", change_percent: -2.1 },
                { symbol: "MOON", name: "Lunar Logistics & Mining ETF", launchDate: "2025-12-20", assetClass: "Equity: Global - Space", issuer: "Ark Invest", change_percent: 8.4 },
            ]
            setLaunches(dummyData)
        } catch {
            toast.error("Failed to fetch new launches")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchLaunches()
    }, [])

    const columns = [
        {
            header: "Launch Date",
            accessorKey: "launchDate",
            cell: (item: NewETF) => (
                <span className="text-[10px] font-mono font-bold text-primary">
                    {format(new Date(item.launchDate), "MMM dd, yyyy")}
                </span>
            ),
            className: "w-[120px]"
        },
        {
            header: "Symbol",
            accessorKey: "symbol",
            className: "w-[100px]"
        },
        {
            header: "Fund Name",
            accessorKey: "name",
            cell: (item: NewETF) => (
                <span className="text-xs font-bold truncate max-w-[250px] block">{item.name}</span>
            )
        },
        {
            header: "Issuer",
            accessorKey: "issuer",
            cell: (item: NewETF) => (
                <Badge variant="outline" className="text-[9px] font-black uppercase border-border/50 bg-muted/20 h-5">
                    {item.issuer}
                </Badge>
            )
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconRocket className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">New ETF Launches</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Tracking the Latest Market Entrants & Thematic Funds
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchLaunches}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <IconCalendarEvent className="size-3 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Listings (90D)</span>
                        </div>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">{launches.length} FUNDS TRACKED</Badge>
                    </div>
                    <CompactGrid 
                        data={launches} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </div>
        </div>
    )
}
