"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Globe, Users, DollarSign, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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
  factor_attribution?: { factor: string, score: number }[];
  raw_factor_metrics?: { f_score?: number, [key: string]: string | number | undefined | unknown };
  [key: string]: string | number | undefined | unknown;
}

export function CompanyProfile({ profile, isLoading }: { profile: ProfileData | null, isLoading?: boolean }) {
  if (isLoading) return (
    <Card className="h-full border-border bg-card/40 backdrop-blur-md flex items-center justify-center p-8 border-dashed">
        <div className="flex flex-col items-center gap-4 animate-pulse">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <div className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Intercepting Intelligence...</div>
        </div>
    </Card>
  )

  if (!profile) return (
    <Card className="h-full border-border bg-card/40 backdrop-blur-md flex items-center justify-center p-8 border-dashed">
        <div className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Awaiting Selection...</div>
    </Card>
  )

  const rawMetrics = profile.raw_factor_metrics || {};
  const fScore = (rawMetrics.f_score as number) ?? 0;
  const insiderScore = (rawMetrics.insider_score as number) ?? 0;
  const isHighConviction = insiderScore >= 100;

  // Piotroski Coloring (0-9 Scale)
  let fScoreColor = "text-muted-foreground";
  let fScoreBg = "bg-muted";
  
  if (fScore >= 7) { fScoreColor = "text-primary"; fScoreBg = "bg-primary/10"; }
  if (fScore <= 3) { fScoreColor = "text-destructive"; fScoreBg = "bg-destructive/10"; }

  return (
    <Card className="h-full border-border bg-card/40 backdrop-blur-md flex flex-col overflow-hidden shadow-2xl">
        {/* --- Sticky Header --- */}
        <div className="p-5 border-b border-border bg-card/30 shrink-0">
            <div className="flex justify-between items-start">
                <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground tracking-tight leading-none italic truncate">
                            {profile.company_name}
                        </h2>
                        {isHighConviction && <span className="text-xl animate-pulse" title="Insider Cluster Buy detected!">🔥</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs h-5 px-2 border-border bg-background text-muted-foreground font-mono uppercase">{profile.symbol}</Badge>
                        {isHighConviction && <Badge className="text-[8px] h-4 bg-orange-500 hover:bg-orange-600 text-white border-none font-black px-1.5">HIGH CONVICTION</Badge>}
                        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider truncate">
                            {profile.sector}
                        </span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end ml-4 shrink-0">
                    <div className="text-3xl font-mono font-black text-primary leading-none tracking-tighter">
                        ${profile.price?.toFixed(2) || "0.00"}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase mt-1.5 bg-muted px-2 py-0.5 rounded border border-border font-bold">
                        {profile.exchange}
                    </span>
                </div>
            </div>
        </div>

        {/* --- Scrollable Body with Accordion --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            <Accordion type="multiple" defaultValue={["signals", "news"]} className="w-full space-y-3">
                
                {/* 1. ALPHA INTELLIGENCE */}
                <AccordionItem value="signals" className="border border-border/50 rounded-xl bg-background/20 px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-primary font-bold">
                        Alpha Intelligence
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 space-y-6">
                        
                        {/* Linear Attribution Bars (Standardized Look) */}
                        <div className="space-y-4 px-1">
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.3em] block mb-2">Factor Attribution Matrix</span>
                            {profile.factor_attribution?.map((f, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-bold font-mono text-foreground/80 uppercase">{f.factor}</span>
                                        <span className="text-[10px] font-mono text-primary font-black">{f.score.toFixed(0)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/10">
                                        <div 
                                            className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]"
                                            style={{ width: `${f.score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className={cn("p-3.5 rounded-xl border", fScoreBg)}>
                                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-1.5">F-Score (Quality)</span>
                                <div className={cn("text-base font-mono font-bold flex items-baseline gap-1", fScoreColor)}>
                                    {fScore}/9 <span className="text-[9px] opacity-70 font-normal">Piotroski</span>
                                </div>
                            </div>
                            <div className={cn(
                                "p-3.5 rounded-xl border",
                                isHighConviction ? "bg-orange-500/10 border-orange-500/30" : 
                                profile.insider_sentiment === "BULLISH" ? "bg-primary/10 border-primary/30" : "bg-muted border-border"
                            )}>
                                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-1.5">Insider</span>
                                <div className={cn(
                                    "text-base font-mono font-bold flex items-center gap-2",
                                    isHighConviction ? "text-orange-500" : 
                                    profile.insider_sentiment === "BULLISH" ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {isHighConviction ? "CLUSTER BUY" : (profile.insider_sentiment || "NEUTRAL")}
                                    {isHighConviction && <span className="text-xs">🔥</span>}
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 2. CORE METRICS */}
                <AccordionItem value="metrics" className="border border-border/50 rounded-xl bg-background/20 px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold">
                        Core Metrics
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Market Cap</span>
                                <div className="text-sm font-mono text-foreground flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-primary/50" />
                                    {profile.market_cap ? (
                                        <>
                                            {`${(profile.market_cap / 1e9).toFixed(2)}B`}
                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-muted border-border font-bold">
                                                {profile.market_cap > 200e9 ? "MEGA" : 
                                                 profile.market_cap > 10e9 ? "LARGE" : 
                                                 profile.market_cap > 2e9 ? "MID" : "SMALL"}
                                            </Badge>
                                        </>
                                    ) : "N/A"}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Employees</span>
                                <div className="text-sm font-mono text-foreground flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary/50" />
                                    {profile.full_time_employees?.toLocaleString() || "N/A"}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Beta (Vol)</span>
                                <div className="text-sm font-mono text-foreground bg-muted px-2 py-0.5 rounded w-fit border border-border/50">
                                    {profile.beta || "N/A"}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">IPO Date</span>
                                <div className="text-sm font-mono text-foreground bg-muted px-2 py-0.5 rounded w-fit border border-border/50">
                                    {profile.ipo_date || "N/A"}
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 3. MARKET INTELLIGENCE (News) */}
                <AccordionItem value="news" className="border border-border/50 rounded-xl bg-background/20 px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold">
                        Real-time Intelligence
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                        <div className="space-y-2.5">
                            {profile.latest_news?.map((news, i) => (
                                <a key={i} href={news.url} target="_blank" rel="noreferrer" className="block p-3 rounded-xl border border-border/30 hover:bg-muted/50 transition-colors group">
                                    <div className="text-xs font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-normal">{news.title}</div>
                                    <div className="flex justify-between mt-2 items-center">
                                        <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase">{new Date(news.publishedDate).toLocaleDateString()}</span>
                                        <Globe className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </a>
                            ))}
                            {(!profile.latest_news || profile.latest_news.length === 0) && (
                                <div className="text-xs text-muted-foreground italic opacity-50 py-6 text-center">No recent signals found.</div>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 4. ENTITY NARRATIVE */}
                <AccordionItem value="narrative" className="border border-border/50 rounded-xl bg-background/20 px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold">
                        Entity Narrative
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                        <p className="text-sm text-muted-foreground leading-relaxed italic font-sans antialiased">
                            {profile.description}
                        </p>
                        {profile.website && (
                            <a href={profile.website} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-2 text-xs uppercase tracking-widest text-primary hover:text-primary/80 font-black transition-colors">
                                <Globe className="h-4 w-4" /> External Profile
                            </a>
                        )}
                    </AccordionContent>
                </AccordionItem>

            </Accordion>
        </div>
        
        {/* --- Footer Status --- */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-between items-center shrink-0">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest italic truncate max-w-[150px] font-bold">
                {profile.industry}
            </span>
            <Badge variant="outline" className="text-[10px] h-5 border-border/50 text-muted-foreground font-mono uppercase tracking-tighter font-bold">Institutional v2.1</Badge>
        </div>
    </Card>
  )
}