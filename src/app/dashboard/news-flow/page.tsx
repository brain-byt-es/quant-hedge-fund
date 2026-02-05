"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { 
    IconRss, 
    IconRefresh,
    IconExternalLink,
    IconTornado,
    IconLock
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"

interface NewsItem {
  id: string
  title: string
  text: string
  date: string
  symbol: string
  symbolList?: string[]
  assetType: string
  changesPercentage: number
  url: string
}

export default function NewsFlowPage() {
    const [news, setNews] = useState<NewsItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchNews = async () => {
        setIsLoading(true)
        try {
            // Simulated dummy data based on reference structure
            const dummyData: NewsItem[] = [
                { 
                    id: "1", title: "NVIDIA Target Raised", text: "NVIDIA shares trading higher after several analysts raised their price targets following blowout earnings guidance.", 
                    date: new Date().toISOString(), symbol: "NVDA", assetType: "stocks", changesPercentage: 4.5, url: "#" 
                },
                { 
                    id: "2", title: "AMD Launch Event", text: "AMD shares lower as market reacts to the latest AI chip benchmark comparisons versus competition.", 
                    date: new Date(Date.now() - 3600000).toISOString(), symbol: "AMD", assetType: "stocks", changesPercentage: -2.1, url: "#" 
                },
                { 
                    id: "3", title: "Apple Regulatory Headwinds", text: "Apple faces new inquiries in EU markets regarding App Store fee structures and side-loading compliance.", 
                    date: new Date(Date.now() - 7200000).toISOString(), symbol: "AAPL", assetType: "stocks", changesPercentage: -0.8, url: "#" 
                },
                { 
                    id: "4", title: "Microsoft Azure Growth", text: "Microsoft cloud revenue growth continues to outpace expectations as enterprise AI adoption scales.", 
                    date: new Date(Date.now() - 10800000).toISOString(), symbol: "MSFT", assetType: "stocks", changesPercentage: 1.2, url: "#" 
                },
            ]
            setNews(dummyData)
        } catch {
            toast.error("Failed to fetch news flow")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchNews()
    }, [])

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconRss className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">News Flow</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Global market intelligence & real-time catalyst feed
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50"
                        onClick={fetchNews}
                    >
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Update Feed
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-4">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-2xl bg-muted/20 animate-pulse border border-border/10" />
                        ))
                    ) : news.map((item) => (
                        <div 
                            key={item.id} 
                            className="p-4 rounded-2xl bg-card/20 border border-border/50 hover:border-primary/30 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-primary uppercase font-mono">
                                            {formatDistanceToNow(new Date(item.date))} ago
                                        </span>
                                        <div className="h-1 w-1 rounded-full bg-border" />
                                        <Link href={`/dashboard/stocks/${item.symbol}`}>
                                            <Badge variant="outline" className="h-5 text-[10px] font-black border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 transition-colors">
                                                {item.symbol}
                                            </Badge>
                                        </Link>
                                    </div>
                                    <p className="text-sm font-bold leading-relaxed text-foreground/90 italic">
                                        &ldquo;{item.text}&rdquo;
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge className={cn(
                                        "h-5 text-[10px] font-black border-none",
                                        item.changesPercentage >= 0 ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                    )}>
                                        {item.changesPercentage >= 0 ? "+" : ""}{item.changesPercentage}%
                                    </Badge>
                                    <IconExternalLink className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <aside className="space-y-6">
                    <Card className="border-border/50 bg-card/20 backdrop-blur-sm">
                        <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <IconTornado className="size-3 text-primary" /> Alpha Signals
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-primary tracking-widest">Market Flow</span>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    Analyze institutional volume clusters and dark pool activity across sectors.
                                </p>
                            </div>
                            <Button variant="outline" className="w-full h-8 text-[9px] font-black uppercase tracking-widest border-border/50" asChild>
                                <Link href="/dashboard/market-flow">View Market Tide</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-primary/5 border-dashed">
                        <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <IconLock className="size-4 text-primary" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Institutional AI</span>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Real-time sentiment scoring and news clustering powered by Groq Llama 3.3.
                            </p>
                            <Badge variant="secondary" className="text-[8px] font-black uppercase">Plus / Pro Feature</Badge>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    )
}