"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Database, FlaskConical, Search, Activity } from "lucide-react"

export default function HelpPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-foreground overflow-hidden p-6 gap-6">
        <div className="flex flex-col gap-2 border-b border-border/40 pb-4 shrink-0">
            <h1 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" /> System Documentation
            </h1>
            <p className="text-sm text-muted-foreground font-mono uppercase tracking-widest font-bold">
                Master Manual v2.1 // Operational Guidelines
            </p>
        </div>

        <Tabs defaultValue="universe" className="flex-1 flex flex-col min-h-0">
            <TabsList className="h-10 w-fit bg-muted/50 border border-border/50 p-1 backdrop-blur-sm mb-6">
                <TabsTrigger value="universe" className="text-xs uppercase tracking-widest font-bold gap-2"><Database className="h-3 w-3" /> Universe & Data</TabsTrigger>
                <TabsTrigger value="quant" className="text-xs uppercase tracking-widest font-bold gap-2"><FlaskConical className="h-3 w-3" /> Quant Lab</TabsTrigger>
                <TabsTrigger value="screener" className="text-xs uppercase tracking-widest font-bold gap-2"><Search className="h-3 w-3" /> Pro Screener</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-10">
                
                {/* 1. DATA UNIVERSE */}
                <TabsContent value="universe" className="space-y-6 mt-0">
                    <Card className="border-border bg-card/20">
                        <CardHeader>
                            <CardTitle className="text-lg font-black uppercase tracking-tight text-primary">The &quot;Active Universe&quot; Strategy</CardTitle>
                            <CardDescription>How we handle 350k assets without going broke.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm leading-relaxed">
                            <p>To avoid expensive API bills and slow processing, this system uses a <strong>SimFin-First</strong> approach:</p>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li><strong>The Anchor:</strong> We use the <Badge variant="outline">SimFin 5000+</Badge> (curated US stocks that file regular reports) as our master list.</li>
                                <li><strong>The Enrichment:</strong> We use FMP to fill the &quot;gaps&quot; (real-time prices, latest filings) <em>only</em> for those 5,000 stocks.</li>
                                <li><strong>The Benefit:</strong> You get institutional-quality data without the 345,000 &quot;junk&quot; tickers.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-border bg-card/20">
                            <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase">SimFin Bulk Ingest</CardTitle></CardHeader>
                            <CardContent className="text-xs text-muted-foreground">
                                <Badge className="mb-2">Weekly</Badge>
                                <p>Downloads the master list of companies and 10+ years of historical fundamentals. Run this first to set your anchor.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border bg-card/20">
                            <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase">Full Backfill</CardTitle></CardHeader>
                            <CardContent className="text-xs text-muted-foreground">
                                <Badge className="mb-2" variant="secondary">Monthly</Badge>
                                <p>Fetches <strong>2 Years</strong> of prices from FMP for the active universe. Fills the 1-year gap in SimFin Free data.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border bg-card/20">
                            <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase">Daily Sync</CardTitle></CardHeader>
                            <CardContent className="text-xs text-muted-foreground">
                                <Badge className="mb-2" variant="outline">Daily</Badge>
                                <p>Fast update. Fetches yesterday&apos;s close and any new filings released in the last 24h.</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* 2. QUANT LAB */}
                <TabsContent value="quant" className="space-y-6 mt-0">
                    <Card className="border-border bg-card/20">
                        <CardHeader>
                            <CardTitle className="text-lg font-black uppercase tracking-tight text-chart-3">Institutional Strategy Lab</CardTitle>
                            <CardDescription>Engineering-first environment for algorithm development.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 text-sm">
                            <div className="grid gap-4">
                                <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                                    <h4 className="font-bold flex items-center gap-2 mb-2"><Activity className="h-4 w-4" /> Strategy Workbench</h4>
                                    <p className="text-muted-foreground mb-2">Dual-pane editor for writing Zipline algorithms (`algorithm.py`) and configuring parameters simultaneously.</p>
                                    <Badge variant="outline" className="font-mono text-[10px]">Use &quot;Inject Code&quot; to deploy changes</Badge>
                                </div>
                                <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                                    <h4 className="font-bold flex items-center gap-2 mb-2"><Activity className="h-4 w-4" /> MLflow Hub</h4>
                                    <p className="text-muted-foreground">Direct integration with MLflow Tracking Server. Every backtest is logged as an immutable experiment run with 88+ metrics.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. SCREENER */}
                <TabsContent value="screener" className="space-y-6 mt-0">
                    <Card className="border-border bg-card/20">
                        <CardHeader>
                            <CardTitle className="text-lg font-black uppercase tracking-tight text-chart-4">Pro Stock Screener</CardTitle>
                            <CardDescription>Real-time volatility scanner inspired by professional day trading desks.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <p>Designed to catch &quot;In-Play&quot; stocks moving on news or momentum.</p>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-bold text-xs uppercase mb-2 text-foreground">Key Metrics</h4>
                                    <ul className="space-y-2 text-muted-foreground font-mono text-xs">
                                        <li className="flex justify-between"><span>Rel Vol (RVol)</span> <span className="text-foreground">Vol / 30D Avg</span></li>
                                        <li className="flex justify-between"><span>Gap %</span> <span className="text-foreground">Open vs Prev Close</span></li>
                                        <li className="flex justify-between"><span>Float</span> <span className="text-foreground">Tradable Shares</span></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-xs uppercase mb-2 text-foreground">Presets</h4>
                                    <ul className="space-y-2 text-muted-foreground font-mono text-xs">
                                        <li><strong className="text-chart-4">Gap &amp; Go:</strong> Gapping up &gt;2% with Volume.</li>
                                        <li><strong className="text-chart-4">Dip Buy:</strong> Gapping down on support.</li>
                                        <li><strong className="text-chart-4">Small Cap:</strong> Low float runners.</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </div>
        </Tabs>
    </div>
  )
}
