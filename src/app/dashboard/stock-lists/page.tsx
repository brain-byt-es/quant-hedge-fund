"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    IconList, 
    IconTrendingUp, 
    IconCurrencyDollar,
    IconFlame,
    IconUsers,
    IconRocket,
    IconBolt
} from "@tabler/icons-react"
import Link from "next/link"

const LIST_CATEGORIES = [
    {
        title: "Performance",
        icon: <IconTrendingUp className="size-4 text-green-500" />,
        lists: [
            { name: "Top Gainers", href: "/dashboard/market-mover" },
            { name: "Overbought Stocks", href: "/dashboard/list/overbought" },
            { name: "Oversold Stocks", href: "/dashboard/list/oversold" },
            { name: "High Momentum", href: "/dashboard/stock-screener" },
        ]
    },
    {
        title: "Thematic",
        icon: <IconFlame className="size-4 text-orange-500" />,
        lists: [
            { name: "Clean Energy", href: "/dashboard/list/clean-energy" },
            { name: "Electric Vehicles", href: "/dashboard/list/electric-vehicles" },
            { name: "Social Media", href: "/dashboard/list/social-media" },
            { name: "Bitcoin ETFs", href: "/dashboard/list/bitcoin-etfs" },
        ]
    },
    {
        title: "Fundamentals",
        icon: <IconCurrencyDollar className="size-4 text-primary" />,
        lists: [
            { name: "Highest Revenue", href: "/dashboard/list/highest-revenue" },
            { name: "Top Dividends", href: "/dashboard/list/dividend" },
            { name: "Most Buybacks", href: "/dashboard/list/buybacks" },
            { name: "Penny Stocks", href: "/dashboard/list/penny-stocks" },
        ]
    },
    {
        title: "Alternative",
        icon: <IconUsers className="size-4 text-violet-500" />,
        lists: [
            { name: "Most Shorted", href: "/dashboard/list/shorted" },
            { name: "Most Employees", href: "/dashboard/list/employees" },
            { name: "Reddit Trending", href: "/dashboard/reddit-tracker" },
            { name: "Politician Picks", href: "/dashboard/congress/flow" },
        ]
    }
]

export default function StockListsPage() {
    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <IconList className="size-6 text-primary" />
                    <h1 className="text-2xl font-black tracking-tighter uppercase italic">Stock Directories</h1>
                </div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                    Curated thematic and quantitative universe snapshots
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {LIST_CATEGORIES.map((cat, i) => (
                    <Card key={i} className="border-border/50 bg-card/20 backdrop-blur-sm flex flex-col">
                        <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                {cat.icon} {cat.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 flex-1">
                            <div className="flex flex-col space-y-1">
                                {cat.lists.map((list, j) => (
                                    <Link key={j} href={list.href}>
                                        <div className="p-2.5 rounded-lg hover:bg-muted/50 transition-all flex items-center justify-between group">
                                            <span className="text-xs font-bold group-hover:text-primary">{list.name}</span>
                                            <IconRocket className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* FEATURED DIRECTORY SKELETON */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <Card className="md:col-span-2 border-primary/20 bg-primary/5 border-dashed">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                            <IconBolt className="size-6 text-primary animate-pulse" />
                        </div>
                        <h3 className="text-lg font-black uppercase italic tracking-tight">Custom Screener Link</h3>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            Generate dynamic lists using the Institutional Screener. All lists update in real-time based on FMP data streams.
                        </p>
                        <Button className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest">
                            Open Universe Screener
                        </Button>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/20">
                    <CardHeader className="py-3 border-b border-border/50">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trending Lists</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {[
                            { n: "Short Squeeze", v: "12 tickers", c: "High Risk" },
                            { n: "High Yield", v: "45 tickers", c: "Value" },
                            { n: "AI Revolution", v: "8 tickers", c: "Growth" }
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center border-b border-border/10 pb-2 last:border-none">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold">{item.n}</span>
                                    <span className="text-[9px] text-muted-foreground uppercase">{item.v}</span>
                                </div>
                                <Badge variant="outline" className="text-[8px] font-black uppercase border-none bg-muted/30">{item.c}</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}