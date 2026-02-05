"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { 
    IconWorld, 
    IconRefresh,
    IconExternalLink,
    IconTrendingUp,
    IconLock
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"

interface NewsArticle {
  title: string
  text: string
  publishedDate: string
  symbol: string
  site: string
  url: string
  image: string
}

export default function MarketNewsPage() {
    const [news, setNews] = useState<NewsArticle[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchNews = async () => {
        setIsLoading(true)
        try {
            // Fetch global market news from backend (FMP fallback)
            const data = await api.getLatestPrices(50) // Placeholder logic or add getMarketNews to api
            // Since I don't have a dedicated 'Market News' endpoint yet, I'll simulate or add one.
            // Let's add getMarketNews to backend.
            setNews([]) // For now
        } catch (err) {
            toast.error("Failed to fetch market news")
        } finally {
            setIsLoading(false)
        }
    }

    // Add dummy news for high-fidelity UI
    const dummyNews: NewsArticle[] = [
        {
            title: "Fed Signals Potential Rate Cut as Inflation Softens",
            text: "Federal Reserve officials indicated that a series of rate cuts could be on the horizon if inflation continues its downward trajectory toward the 2% target.",
            publishedDate: new Date().toISOString(),
            symbol: "SPY",
            site: "Bloomberg",
            url: "#",
            image: "https://images.unsplash.com/photo-1611974717482-48217760e8f1?q=80&w=2070&auto=format&fit=crop"
        },
        {
            title: "Semiconductor Rally Continues Amid AI Infrastructure Surge",
            text: "Major chipmakers saw significant gains today as enterprise demand for high-performance computing hardware shows no signs of slowing down.",
            publishedDate: new Date(Date.now() - 7200000).toISOString(),
            symbol: "NVDA",
            site: "Reuters",
            url: "#",
            image: "https://images.unsplash.com/photo-1591444072345-f79a732df093?q=80&w=2070&auto=format&fit=crop"
        }
    ]

    useEffect(() => {
        setNews(dummyNews)
        setIsLoading(false)
    }, [])

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconWorld className="size-6 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Market News</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Aggregated Financial Intelligence & Global Headlines
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50">
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Update
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {news.map((item, i) => (
                        <div key={i} className="flex flex-col md:flex-row gap-6 group cursor-pointer">
                            <div className="w-full md:w-64 h-40 shrink-0 rounded-2xl overflow-hidden border border-border/50 relative">
                                <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute top-2 left-2">
                                    <Badge className="bg-background/80 backdrop-blur-md text-[9px] font-black border-none">{item.symbol}</Badge>
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-primary uppercase">{item.site}</span>
                                    <div className="h-1 w-1 rounded-full bg-border" />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{formatDistanceToNow(new Date(item.publishedDate))} ago</span>
                                </div>
                                <h2 className="text-xl font-black leading-tight group-hover:text-primary transition-colors">{item.title}</h2>
                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{item.text}</p>
                                <Button variant="link" className="p-0 h-auto text-[10px] font-black uppercase tracking-widest text-primary gap-1.5">
                                    Read Full Story <IconExternalLink className="size-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <aside className="lg:col-span-4 space-y-6">
                    <Card className="border-border/50 bg-card/20 backdrop-blur-sm">
                        <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <IconTrendingUp className="size-3.5 text-primary" /> Trending Headlines
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {[
                                "Crypto Regulation Update",
                                "Oil Prices Stabilize Post-OPEC",
                                "Tech Earnings Preview: Big Seven",
                                "Emerging Markets Growth Outlook"
                            ].map((headline, i) => (
                                <div key={i} className="group cursor-pointer border-b border-border/10 pb-3 last:border-none">
                                    <h4 className="text-xs font-bold leading-snug group-hover:text-primary transition-colors">{headline}</h4>
                                    <span className="text-[9px] text-muted-foreground uppercase font-black mt-1 block">Reuters • 2h ago</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-primary/5 border-dashed">
                        <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                            <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                                <IconLock className="size-5 text-primary" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Premium News Core</span>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Access real-time wires from Bloomberg, Dow Jones, and CNBC with AI-powered sentiment extraction.
                            </p>
                            <Button variant="secondary" className="h-8 text-[9px] font-black uppercase tracking-widest px-6">Upgrade to Pro</Button>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    )
}