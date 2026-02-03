"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { Loader2, MapPin, Phone, Mail, Globe, User, Users } from "lucide-react"
import { StockChart } from "@/components/research/stock-chart"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Stock360Data {
  symbol: string
  quote: {
    price: number
    changesPercentage: number
    volume: number
    [key: string]: string | number | boolean | null | undefined
  }
  trading: {
    last: number
    change: number
    change_p: number
    day_low: number
    day_high: number
    year_low: number
    year_high: number
    open: number
    prev_close: number
    bid: number
    ask: number
    bid_size: number
    ask_size: number
    status: string
  }
  profile: {
    companyName: string
    description: string
    [key: string]: string | number | boolean | null | undefined
  }
  stats: {
    float: number
    market_cap: number
    volume_avg: number
    volume: number
    shares_outstanding: number
    pe_ratio: number
    pb_ratio: number
    eps: number
    beta: number
    vwap: number
  }
  industry: {
    sector: string
    industry: string
    group: string
    cik: string
    isin: string
    cusip: string
    sic: string
    naics: string
    exchange: string
  }
  contact: {
    address: string
    phone: string
    website: string
    ceo: string
    employees: string | number
    auditor: string
    issue_type: string
  }
  catalysts: Array<{
    type: string
    title: string
    date: string
    url: string
    source: string
  }>
}

interface Stock360Props {
  symbol: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Stock360Dialog({ symbol, open, onOpenChange }: Stock360Props) {
  const [data, setData] = useState<Stock360Data | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      if (!open || !symbol) return
      setLoading(true)
      try {
        const result = await api.getStock360(symbol)
        if (isMounted) setData(result)
      } catch (err) {
        console.error("Failed to load 360 data", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [open, symbol])

  if (!symbol) return null

  const t = data?.trading || { last: 0, change: 0, change_p: 0, bid: 0, ask: 0, bid_size: 0, ask_size: 0, day_low: 0, day_high: 0, year_low: 0, year_high: 0, open: 0, prev_close: 0, status: "Closed" }
  const s = data?.stats || { float: 0, market_cap: 0, volume_avg: 0, volume: 0, shares_outstanding: 0, pe_ratio: 0, pb_ratio: 0, eps: 0, beta: 0, vwap: 0 }
  const p = data?.profile || { companyName: "", description: "" }
  const i = data?.industry || { sector: "", industry: "", group: "", cik: "", isin: "", cusip: "", sic: "", naics: "", exchange: "" }
  const c = data?.contact || { address: "", phone: "", website: "", ceo: "", employees: 0, auditor: "", issue_type: "" }
  const isLowFloat = s.float < 10000000

  const formatLarge = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "b"
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "m"
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "k"
    return num?.toString() || "0"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-[1000px] h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-background shadow-2xl">
        <DialogTitle className="sr-only">Stock Quote for {symbol}</DialogTitle>
        
        {loading ? (
          <div className="h-full flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span className="font-mono text-xs uppercase tracking-widest animate-pulse">Aggregating Intelligence...</span>
            </div>
          </div>
        ) : data ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* --- BLOOMBERG STYLE HEADER --- */}
            <div className="p-6 border-b bg-muted/30 shrink-0">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <h1 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Stock Quote for {symbol}</h1>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black tracking-tighter uppercase">{p.companyName} ({symbol})</h2>
                    {isLowFloat && <Badge className="bg-destructive hover:bg-destructive/90 animate-pulse text-[10px] font-black uppercase tracking-tighter">LOW FLOAT</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-2xl font-mono">
                    <span className="font-bold text-foreground">${t.last?.toFixed(2)}</span>
                    <span className={`font-bold ${t.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {t.change >= 0 ? "+" : ""}{t.change?.toFixed(2)} ({t.change_p?.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
                    <span>Bid: <span className="text-foreground font-bold">{t.bid?.toFixed(2)}</span> x {t.bid_size}</span>
                    <span>Ask: <span className="text-foreground font-bold">{t.ask?.toFixed(2)}</span> x {t.ask_size}</span>
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                    <div className="text-xs font-mono font-bold text-muted-foreground">
                        {format(new Date(), "MMMM dd, yyyy h:mm a")} ET
                    </div>
                    <div className="text-sm font-mono flex items-center justify-end gap-2">
                        <span className="text-muted-foreground uppercase">Volume:</span>
                        <span className="font-bold text-foreground">{t.last ? formatLarge(data.quote.volume) : "-"}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2">
                        <Badge variant="outline" className="font-mono text-[10px]">{data.quote.exchange || i.exchange}</Badge>
                        <Badge variant={t.status === "Open" ? "default" : "secondary"} className="text-[9px] uppercase tracking-tighter">
                            Market {t.status}
                        </Badge>
                    </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* --- LEFT COL: DETAILED QUOTE --- */}
                <div className="lg:col-span-2 space-y-6">
                    
                    <Card className="border-border/50 bg-card/20 shadow-sm">
                        <CardHeader className="py-3 border-b border-border/50">
                            <CardTitle className="text-xs uppercase tracking-[0.2em] font-black text-primary">Detailed Quote</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8">
                                {[
                                    { l: "Last", v: t.last?.toFixed(2), b: true },
                                    { l: "$ Chg", v: t.change?.toFixed(3), c: t.change >= 0 ? "text-green-500" : "text-red-500" },
                                    { l: "Open", v: t.open?.toFixed(2) },
                                    { l: "High", v: t.day_high?.toFixed(2) },
                                    { l: "Bid", v: t.bid?.toFixed(2) },
                                    { l: "Bid Size", v: t.bid_size },
                                    { l: "Beta", v: s.beta?.toFixed(5) },
                                    { l: "Year High", v: t.year_high?.toFixed(2) },
                                    { l: "Market Cap", v: formatLarge(s.market_cap) },
                                    { l: "P/B Ratio", v: s.pb_ratio?.toFixed(2) },
                                    { l: "EPS", v: s.eps?.toFixed(2) },
                                    { l: "Avg Vol (30d)", v: formatLarge(s.volume_avg) },
                                    { l: "Volume", v: formatLarge(data.quote.volume) },
                                    { l: "% Chg", v: t.change_p?.toFixed(2) + "%", c: t.change_p >= 0 ? "text-green-500" : "text-red-500" },
                                    { l: "Prev. Close", v: t.prev_close?.toFixed(2) },
                                    { l: "Low", v: t.day_low?.toFixed(2) },
                                    { l: "Ask", v: t.ask?.toFixed(2) },
                                    { l: "Ask Size", v: t.ask_size },
                                    { l: "VWAP", v: s.vwap?.toFixed(5) },
                                    { l: "Year Low", v: t.year_low?.toFixed(2) },
                                    { l: "Shares Out", v: formatLarge(s.shares_outstanding) },
                                    { l: "Float", v: formatLarge(s.float), c: isLowFloat ? "text-destructive font-black underline" : "" },
                                    { l: "Exchange", v: i.exchange }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex justify-between border-b border-border/30 pb-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.l}</span>
                                        <span className={cn("text-xs font-mono font-bold text-foreground", item.c, item.b && "text-sm")}>{item.v || "-"}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- CENTER: CHARTING --- */}
                    <Card className="border-border/50 bg-card/20 shadow-sm overflow-hidden">
                        <CardHeader className="py-3 border-b border-border/50 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs uppercase tracking-[0.2em] font-black text-primary">Charting</CardTitle>
                            <Badge variant="outline" className="text-[9px] uppercase font-mono">Daily / 1Y</Badge>
                        </CardHeader>
                        <CardContent className="p-0 h-[350px]">
                            <StockChart symbol={symbol} />
                        </CardContent>
                    </Card>

                    {/* --- BOTTOM: PROFILE --- */}
                    <Card className="border-border/50 bg-card/20 shadow-sm">
                        <CardHeader className="py-3 border-b border-border/50">
                            <CardTitle className="text-xs uppercase tracking-[0.2em] font-black text-primary">Company Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Accordion type="single" collapsible defaultValue="description" className="w-full">
                                <AccordionItem value="description" className="border-none px-4">
                                    <AccordionTrigger className="text-xs font-bold uppercase py-3 hover:no-underline">Description & Contact Information</AccordionTrigger>
                                    <AccordionContent className="space-y-4 pb-4">
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] uppercase font-black text-muted-foreground underline decoration-primary/50 underline-offset-4">Business Description</h4>
                                            <p className="text-xs leading-relaxed text-foreground/90 italic font-sans">{p.description}</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="h-3 w-3 mt-0.5 text-primary" />
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Address</span>
                                                        <span className="text-xs">{c.address}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3 w-3 text-primary" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Telephone</span>
                                                        <span className="text-xs">{c.phone || "N/A"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-3 w-3 text-primary" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Website</span>
                                                        <a href={c.website} target="_blank" className="text-xs text-primary hover:underline truncate max-w-[200px]">{c.website}</a>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3 text-primary" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Email</span>
                                                        <span className="text-xs">info@{symbol.toLowerCase()}.com</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                
                                <AccordionItem value="details" className="border-t border-border/50 px-4">
                                    <AccordionTrigger className="text-xs font-bold uppercase py-3 hover:no-underline">Details</AccordionTrigger>
                                    <AccordionContent className="pb-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {[
                                                { l: "CEO", v: c.ceo, i: <User className="h-3 w-3" /> },
                                                { l: "Employees", v: c.employees, i: <Users className="h-3 w-3" /> },
                                                { l: "Issue Type", v: c.issue_type },
                                                { l: "Auditor", v: c.auditor },
                                                { l: "Market Cap", v: s.market_cap?.toLocaleString() }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex flex-col border-l border-primary/20 pl-2">
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{item.l}</span>
                                                    <span className="text-xs font-bold flex items-center gap-1.5">{item.i}{item.v || "-"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>

                {/* --- RIGHT COL: INDUSTRY & NEWS --- */}
                <div className="space-y-6">
                    
                    <Card className="border-border/50 bg-card/20 shadow-sm">
                        <CardHeader className="py-3 border-b border-border/50">
                            <CardTitle className="text-xs uppercase tracking-[0.2em] font-black text-primary">Industry Classifications</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {[
                                { l: "Sector", v: i.sector },
                                { l: "CIK", v: i.cik },
                                { l: "Group", v: i.group },
                                { l: "SIC", v: i.sic },
                                { l: "Industry", v: i.industry },
                                { l: "NAICS", v: i.naics }
                            ].map((item, idx) => (
                                <div key={idx} className="flex justify-between border-b border-border/30 pb-1">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{item.l}</span>
                                    <span className="text-[11px] font-mono font-bold text-foreground text-right">{item.v || "-"}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-card/20 shadow-sm flex flex-col h-[600px]">
                        <CardHeader className="py-3 border-b border-border/50 shrink-0">
                            <CardTitle className="text-xs uppercase tracking-[0.2em] font-black text-primary">News and Media</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="p-4 space-y-6">
                                    {data.catalysts.map((item, idx) => (
                                        <div key={idx} className="space-y-2 border-l-2 border-primary/20 pl-3 relative">
                                            <div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-primary" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black uppercase text-muted-foreground">{item.source} • {item.date ? format(new Date(item.date), "h:mm a") : ""}</span>
                                                <Badge variant={item.type === "SEC" ? "destructive" : "secondary"} className="text-[8px] h-3 px-1">{item.type}</Badge>
                                            </div>
                                            <a href={item.url} target="_blank" className="text-xs font-bold leading-tight hover:text-primary transition-colors block decoration-primary/30 underline underline-offset-2">
                                                {item.title}
                                            </a>
                                            <div className="text-[9px] font-mono text-muted-foreground">
                                                {item.date ? format(new Date(item.date), "EEE MMM do, yyyy") : ""}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                </div>

              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
