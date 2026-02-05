"use client"

import { useEffect, useState } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
    IconBrandReddit, 
    IconTrendingUp,
    IconMessageCircle,
    IconRefresh,
    IconMoodSmile,
    IconMoodSad,
    IconMoodNeutral
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface RedditSentiment {
  symbol: string
  name: string
  rank: number
  sentiment: number
  lastSentiment: number
  mentions: number
  lastMentions: number
  changesPercentage?: number
  change_percent?: number
}

export default function RedditTrackerPage() {
    const [trending, setTrending] = useState<RedditSentiment[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchSentiment = async () => {
        setIsLoading(true)
        try {
            const data = await api.getRedditSentiment()
            setTrending(data || [])
        } catch (err) {
            toast.error("Failed to fetch Reddit sentiment")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchSentiment()
    }, [])

    const columns = [
        {
            header: "Rank",
            accessorKey: "rank",
            cell: (item: RedditSentiment) => (
                <span className="font-black font-mono text-xs opacity-50">#{item.rank}</span>
            ),
            className: "w-[60px]",
            sortable: true
        },
        {
            header: "Symbol",
            accessorKey: "symbol",
            className: "w-[100px]",
            sortable: true
        },
        {
            header: "Mentions",
            accessorKey: "mentions",
            cell: (item: RedditSentiment) => {
                const diff = item.mentions - (item.lastMentions || 0)
                const isUp = diff > 0
                return (
                    <div className="flex items-center gap-2">
                        <IconMessageCircle className="size-3 text-muted-foreground" />
                        <span className="font-mono text-xs font-bold">{item.mentions.toLocaleString()}</span>
                        {diff !== 0 && (
                            <span className={cn(
                                "text-[9px] font-bold",
                                isUp ? "text-green-500" : "text-red-500"
                            )}>
                                {isUp ? "+" : ""}{diff}
                            </span>
                        )}
                    </div>
                )
            },
            sortable: true
        },
        {
            header: "Sentiment",
            accessorKey: "sentiment",
            cell: (item: RedditSentiment) => {
                const s = item.sentiment
                let Icon = IconMoodNeutral
                let color = "text-muted-foreground"
                let label = "Neutral"

                if (s > 0.5) {
                    Icon = IconMoodSmile
                    color = "text-green-500"
                    label = "Bullish"
                } else if (s < -0.5) {
                    Icon = IconMoodSad
                    color = "text-red-500"
                    label = "Bearish"
                }

                return (
                    <div className="flex items-center gap-2">
                        <Icon className={cn("size-4", color)} />
                        <span className={cn("text-[10px] font-black uppercase tracking-tighter", color)}>
                            {label} ({s.toFixed(2)})
                        </span>
                    </div>
                )
            },
            sortable: true
        },
        {
            header: "Momentum",
            accessorKey: "momentum",
            cell: (item: RedditSentiment) => {
                const sDiff = item.sentiment - (item.lastSentiment || 0)
                const isUp = sDiff > 0
                return (
                    <Badge variant="outline" className={cn(
                        "text-[9px] font-black uppercase border-none h-5",
                        isUp ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                        {isUp ? "Gaining Traction" : "Cooling Down"}
                    </Badge>
                )
            }
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconBrandReddit className="size-5 text-orange-500" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Reddit Sentiment</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Tracking WallStreetBets Trending Tickers
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchSentiment}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Update Sentiment
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <IconTrendingUp className="size-3 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">WSB Trending Loop</span>
                        </div>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">TOP 20 TICKERS</Badge>
                    </div>
                    <PaginatedTable 
                        data={trending} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </div>
        </div>
    )
}
