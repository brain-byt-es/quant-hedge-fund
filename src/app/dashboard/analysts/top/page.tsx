"use client"

import { useState, useEffect } from "react"
import { CompactGrid } from "@/components/market-hub/compact-grid"
import { Badge } from "@/components/ui/badge"
import { 
    IconUserSearch, 
    IconStar, 
    IconRefresh,
    IconTrendingUp,
    IconTrendingDown
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Analyst {
  rank: number
  name: string
  analystScore: number
  successRate: number
  avgReturn: number
  totalRatings: number
  lastRating: string
  symbol?: string
}

export default function TopAnalystsPage() {
    const [analysts, setAnalysts] = useState<Analyst[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchAnalysts = async () => {
        setIsLoading(true)
        try {
            // Placeholder: In real app, we would add api.getTopAnalysts
            // For now, simulating with dummy data based on reference structure
            const dummyData: Analyst[] = [
                { rank: 1, name: "Quinn Bolton", analystScore: 4.8, successRate: 72.5, avgReturn: 34.2, totalRatings: 412, lastRating: "2026-02-01" },
                { rank: 2, name: "Rick Schafer", analystScore: 4.7, successRate: 68.1, avgReturn: 28.5, totalRatings: 385, lastRating: "2026-01-28" },
                { rank: 3, name: "Timothy Arcuri", analystScore: 4.6, successRate: 65.4, avgReturn: 25.1, totalRatings: 520, lastRating: "2026-02-02" },
                { rank: 4, name: "Vivek Arya", analystScore: 4.5, successRate: 63.8, avgReturn: 22.4, totalRatings: 440, lastRating: "2026-01-30" },
                { rank: 5, name: "Ross Seymore", analystScore: 4.5, successRate: 62.9, avgReturn: 21.8, totalRatings: 390, lastRating: "2026-02-01" },
            ]
            setAnalysts(dummyData)
        } catch {
            toast.error("Failed to fetch analyst rankings")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchAnalysts()
    }, [])

    const columns = [
        {
            header: "Rank",
            accessorKey: "rank",
            cell: (item: Analyst) => <span className="font-mono text-[10px] font-black opacity-50">#{item.rank}</span>,
            className: "w-[60px]"
        },
        {
            header: "Analyst Name",
            accessorKey: "name",
            cell: (item: Analyst) => (
                <div className="flex flex-col">
                    <span className="text-xs font-black group-hover:text-primary transition-colors">{item.name}</span>
                    <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <IconStar 
                                key={i} 
                                className={cn(
                                    "size-2.5", 
                                    i < Math.floor(item.analystScore) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                                )} 
                            />
                        ))}
                        <span className="text-[9px] font-bold text-muted-foreground ml-1">({item.analystScore})</span>
                    </div>
                </div>
            )
        },
        {
            header: "Success Rate",
            accessorKey: "successRate",
            cell: (item: Analyst) => (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-none h-5 text-[10px] font-black">
                    {item.successRate}%
                </Badge>
            )
        },
        {
            header: "Avg. Return",
            accessorKey: "avgReturn",
            cell: (item: Analyst) => (
                <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                    {item.avgReturn > 0 ? <IconTrendingUp className="size-3 text-green-500" /> : <IconTrendingDown className="size-3 text-red-500" />}
                    <span className={item.avgReturn > 0 ? "text-green-500" : "text-red-500"}>
                        {item.avgReturn > 0 ? "+" : ""}{item.avgReturn}%
                    </span>
                </div>
            )
        },
        {
            header: "Total Ratings",
            accessorKey: "totalRatings",
            cell: (item: Analyst) => <span className="font-mono text-xs font-bold text-muted-foreground">{item.totalRatings}</span>
        },
        {
            header: "Last Activity",
            accessorKey: "lastRating",
            cell: (item: Analyst) => <span className="text-[10px] font-medium uppercase text-muted-foreground">{item.lastRating}</span>
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconUserSearch className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Wall Street Performance</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Rankings based on historical accuracy and alpha generation
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchAnalysts}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Update Rankings
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Top Performing Analysts</span>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">TOP 100 LIST</Badge>
                    </div>
                    <CompactGrid 
                        data={analysts} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </div>
        </div>
    )
}