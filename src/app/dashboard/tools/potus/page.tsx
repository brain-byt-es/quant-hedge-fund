"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    IconUserCircle, 
    IconBuildingMonument, 
    IconBrandX, 
    IconActivity,
    IconTrendingUp,
    IconTrendingDown,
    IconExternalLink,
    IconRefresh,
    IconScale
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const MOCK_SCHEDULE = [
    { date: "2026-02-03", time: "10:00 AM", details: "Presidential Briefing on Trade Policy", location: "Oval Office" },
    { date: "2026-02-03", time: "02:30 PM", details: "Meeting with Tech Industry Leaders regarding AI Safety", location: "Cabinet Room" },
    { date: "2026-02-02", time: "11:00 AM", details: "Executive Order Signing Ceremony: Energy Independence", location: "Rose Garden" },
]

const MOCK_ORDERS = [
    { date: "2026-02-02", title: "Strengthening Domestic Energy Production", sentiment: "Bullish", description: "Directing federal agencies to fast-track permits for geothermal and nuclear projects to ensure long-term power stability.", link: "#" },
    { date: "2026-01-28", title: "Reciprocal Trade Transparency Act", sentiment: "Neutral", description: "Mandating disclosure of international supply chain dependencies for critical infrastructure components.", link: "#" },
]

const MOCK_POSTS = [
    { date: "2026-02-03T08:15:00Z", content: "The S&P 500 is hitting record highs because of our deregulatory agenda! AMERICA FIRST! 🇺🇸", engagement: "142K" },
    { date: "2026-02-02T19:45:00Z", content: "Big meetings today on AI. We will lead the world in innovation while keeping our workers safe. Very important!", engagement: "98K" },
]

export default function POTUSTrackerPage() {
    const [activeTab, setActiveIdx] = useState(0)
    const [selectedSector, setSelectedSector] = useState("Technology")
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 500)
        return () => clearTimeout(timer)
    }, [])

    const tabs = ["Schedule", "Executive Actions", "Social Feed"]

    return (
        <div className="flex flex-col space-y-6 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconBuildingMonument className="size-6 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">POTUS Intelligence</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Tracking Policy Catalysts & Market Impact
                    </p>
                </div>
                <div className="flex bg-muted/30 p-1 rounded-full border border-border/50">
                    {["Technology", "Energy", "Finance"].map((s) => (
                        <Button 
                            key={s}
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                                "h-7 rounded-full px-4 text-[9px] font-black uppercase tracking-widest transition-all",
                                selectedSector === s ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                            )}
                            onClick={() => setSelectedSector(s)}
                        >
                            {s}
                        </Button>
                    ))}
                </div>
            </div>

            {/* PERFORMANCE HUD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-emerald-500/20 bg-emerald-500/5 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <IconTrendingUp className="size-16 text-emerald-500" />
                    </div>
                    <CardHeader className="py-3">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Sector Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="flex flex-col">
                            <span className="text-2xl font-black font-mono text-emerald-500">+12.4%</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-bold">{selectedSector} Growth since Inauguration</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/20 md:col-span-2">
                    <CardContent className="p-0 h-full flex items-center px-6">
                        <div className="flex-1 flex items-center gap-8">
                            <div className="flex flex-col">
                                <span className="text-xs font-black uppercase text-muted-foreground mb-1">Actions (30D)</span>
                                <span className="text-xl font-black font-mono">14</span>
                            </div>
                            <div className="h-8 w-[1px] bg-border/50" />
                            <div className="flex flex-col">
                                <span className="text-xs font-black uppercase text-muted-foreground mb-1">Schedule Density</span>
                                <span className="text-xl font-black font-mono text-primary">High</span>
                            </div>
                            <div className="h-8 w-[1px] bg-border/50" />
                            <div className="flex flex-col">
                                <span className="text-xs font-black uppercase text-muted-foreground mb-1">Sentiment Loop</span>
                                <Badge className="bg-green-500/20 text-green-500 border-none font-black text-[10px]">BULLISH</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex gap-1 border-b border-border/50 pb-2">
                {tabs.map((tab, i) => (
                    <Button 
                        key={tab}
                        variant="ghost" 
                        size="sm"
                        className={cn(
                            "h-8 rounded-full px-4 text-xs font-bold transition-all",
                            activeTab === i ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground"
                        )}
                        onClick={() => setActiveIdx(i)}
                    >
                        {tab}
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                    {activeTab === 0 && (
                        <div className="space-y-4">
                            {MOCK_SCHEDULE.map((item, i) => (
                                <div key={i} className="flex gap-4 relative">
                                    <div className="flex flex-col items-center">
                                        <div className="h-3 w-3 rounded-full bg-primary border-2 border-background z-10" />
                                        <div className="flex-1 w-[1px] bg-border/50" />
                                    </div>
                                    <div className="pb-6">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase font-mono">{format(new Date(item.date), "MMM dd")} • {item.time}</span>
                                        <h3 className="text-sm font-bold text-foreground mt-1">{item.details}</h3>
                                        <span className="text-[10px] font-medium text-primary uppercase tracking-widest">{item.location}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 1 && (
                        <div className="space-y-4">
                            {MOCK_ORDERS.map((order, i) => (
                                <Card key={i} className="border-border/50 bg-card/20 overflow-hidden group">
                                    <CardHeader className="py-3 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <IconScale className="size-3.5 text-primary" />
                                            <CardTitle className="text-xs font-black uppercase tracking-tight">{order.title}</CardTitle>
                                        </div>
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] font-black border-none h-5",
                                            order.sentiment === "Bullish" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                                        )}>{order.sentiment}</Badge>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        <p className="text-xs text-foreground/80 leading-relaxed italic">&ldquo;{order.description}&rdquo;</p>
                                        <div className="flex items-center justify-between pt-2 border-t border-border/10">
                                            <span className="text-[10px] font-mono text-muted-foreground">{format(new Date(order.date), "MMMM dd, yyyy")}</span>
                                            <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest gap-1.5">
                                                Read Source <IconExternalLink className="size-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {activeTab === 2 && (
                        <div className="space-y-4">
                            {MOCK_POSTS.map((post, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-card/20 border border-border/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                                                <IconUserCircle className="size-5 text-red-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black">Donald J. Trump</span>
                                                <span className="text-[9px] text-muted-foreground">@realDonaldTrump</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-muted-foreground">{format(new Date(post.date), "MMM dd, h:mm a")}</span>
                                    </div>
                                    <p className="text-sm font-bold leading-relaxed">{post.content}</p>
                                    <div className="flex items-center gap-4 pt-2 border-t border-border/10 text-[10px] font-black text-muted-foreground">
                                        <span>REPLIES: {post.engagement}</span>
                                        <div className="h-1 w-1 rounded-full bg-border" />
                                        <IconBrandX className="size-3 opacity-50" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <aside className="lg:col-span-4 space-y-6">
                    <Card className="border-primary/20 bg-primary/5 border-dashed">
                        <CardHeader className="py-3 border-b border-primary/10">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <IconActivity className="size-3.5" /> Intelligence Radar
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Our AI engine continuously parses Truth Social feeds and federal filings to quantify market sentiment shifts before they hit mainstream news.
                            </p>
                            <div className="mt-4 p-3 rounded-lg bg-background/50 border border-border/30">
                                <span className="text-[9px] font-black text-primary uppercase block mb-1">Status</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-bold">REAL-TIME MONITORING ACTIVE</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    )
}