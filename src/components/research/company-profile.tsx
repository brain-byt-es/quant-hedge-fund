"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Globe, Users, DollarSign, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfileData {
  symbol: string;
  company_name: string;
  sector: string;
  industry: string;
  price: number;
  exchange: string;
  market_cap: number;
  full_time_employees: number;
  beta: number;
  ipo_date: string;
  description: string;
  website: string;
  dcf_value?: number;
  insider_sentiment?: string;
  latest_news?: { title: string, publishedDate: string, url: string, text: string }[];
  [key: string]: string | number | undefined | unknown;
}

export function CompanyProfile({ profile, isLoading }: { profile: ProfileData | null, isLoading?: boolean }) {
  if (isLoading) return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex items-center justify-center p-8 border-dashed">
        <div className="flex flex-col items-center gap-4 animate-pulse">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em]">Intercepting Intelligence...</div>
        </div>
    </Card>
  )

  if (!profile) return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex items-center justify-center p-8 border-dashed">
        <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em]">Awaiting Selection...</div>
    </Card>
  )

  return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-border/50 bg-card/30">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-foreground tracking-tight leading-none italic">
                        {profile.company_name}
                    </h2>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] h-3.5 px-1.5 border-border bg-background text-muted-foreground font-mono uppercase">{profile.symbol}</Badge>
                        <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
                            {profile.sector} {"//"} {profile.industry}
                        </span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter mb-1">Quote</span>
                    <div className="text-2xl font-mono font-black text-primary leading-none tracking-tighter">
                        ${profile.price.toFixed(2)}
                    </div>
                    <span className="text-[8px] text-muted-foreground font-mono uppercase mt-1 bg-muted px-1 rounded border border-border">
                        {profile.exchange}
                    </span>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            
            {/* 1. ALPHA SIGNALS (New) */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <span className="text-[9px] text-primary/60 uppercase font-black tracking-widest block mb-1">DCF Valuation</span>
                    <div className="text-sm font-mono font-bold text-primary">
                        {profile.dcf_value ? `${profile.dcf_value.toFixed(2)}` : "N/A"}
                    </div>
                    <span className="text-[8px] text-muted-foreground uppercase font-mono">Intrinsic Value</span>
                </div>
                <div className={cn(
                    "p-3 rounded-lg border",
                    profile.insider_sentiment === "BULLISH" ? "bg-primary/10 border-primary/20" : "bg-muted border-border"
                )}>
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block mb-1">Insider Sentiment</span>
                    <div className={cn(
                        "text-sm font-mono font-bold",
                        profile.insider_sentiment === "BULLISH" ? "text-primary" : "text-muted-foreground"
                    )}>
                        {profile.insider_sentiment || "NEUTRAL"}
                    </div>
                    <span className="text-[8px] text-muted-foreground uppercase font-mono">Last 5 Trades</span>
                </div>
            </div>

            {/* 2. MARKET INTELLIGENCE (News) */}
            <div className="space-y-3">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-[0.2em] flex items-center gap-2">
                    <Globe className="h-3 w-3" /> Market Intelligence
                </span>
                <div className="space-y-2">
                    {profile.latest_news?.map((news, i) => (
                        <a key={i} href={news.url} target="_blank" rel="noreferrer" className="block p-2 rounded border border-border/50 hover:bg-muted/50 transition-colors group">
                            <div className="text-[10px] font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{news.title}</div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[8px] text-muted-foreground font-mono">{new Date(news.publishedDate).toLocaleDateString()}</span>
                                <span className="text-[8px] text-primary font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity">Read Source ›</span>
                            </div>
                        </a>
                    ))}
                    {(!profile.latest_news || profile.latest_news.length === 0) && (
                        <div className="text-[9px] text-muted-foreground italic opacity-50">No recent intelligence found...</div>
                    )}
                </div>
            </div>

            {/* 3. Metrics Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-border/50">
                <div className="space-y-1 group">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest block group-hover:text-foreground transition-colors">Market Cap</span>
                    <div className="text-xs font-mono text-foreground flex items-center gap-1.5 bg-background/20 p-1.5 rounded border border-transparent group-hover:border-border transition-all">
                        <DollarSign className="h-3 w-3 text-primary/50" />
                        {(profile.market_cap / 1e9).toFixed(2)}B
                    </div>
                </div>
                <div className="space-y-1 group">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest block group-hover:text-foreground transition-colors">Employees</span>
                    <div className="text-xs font-mono text-foreground flex items-center gap-1.5 bg-background/20 p-1.5 rounded border border-transparent group-hover:border-border transition-all">
                        <Users className="h-3 w-3 text-chart-1/50" />
                        {profile.full_time_employees?.toLocaleString()}
                    </div>
                </div>
                <div className="space-y-1 group">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest block group-hover:text-foreground transition-colors">Beta (Vol)</span>
                    <div className="text-xs font-mono text-foreground bg-background/20 p-1.5 rounded border border-transparent group-hover:border-border transition-all">
                        {profile.beta}
                    </div>
                </div>
                <div className="space-y-1 group">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest block group-hover:text-foreground transition-colors">IPO Date</span>
                    <div className="text-xs font-mono text-foreground bg-background/20 p-1.5 rounded border border-transparent group-hover:border-border transition-all">
                        {profile.ipo_date}
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2 border-t border-border/50 pt-4">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-[0.2em] block">Entity Narrative</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic opacity-80">
                    {profile.description}
                </p>
            </div>
            
            {/* Footer Link */}
            {profile.website && (
                <div className="pt-4 border-t border-border/50 flex justify-between items-center">
                    <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-primary hover:text-primary/80 font-bold transition-colors">
                        <Globe className="h-3 w-3" /> Connect to Entity
                    </a>
                    <span className="text-[8px] text-muted-foreground font-mono uppercase tracking-widest">Auth: Institutional</span>
                </div>
            )}
        </div>
    </Card>
  )
}
