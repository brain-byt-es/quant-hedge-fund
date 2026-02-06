"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { Loader2, MapPin, Phone, Mail, Globe } from "lucide-react"
import { StockChart } from "@/components/research/stock-chart"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
    IconActivity, 
    IconBrain, 
    IconFileText, 
    IconReportAnalytics,
    IconFlask
} from "@tabler/icons-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

interface RatioData {
    ratios: Record<string, Record<string, number>>
    piotroski: Record<string, number>
    summary: string
}

interface FinancialsData {
    income: Record<string, string | number | null | undefined>[]
    balance: Record<string, string | number | null | undefined>[]
    cash: Record<string, string | number | null | undefined>[]
}

interface Stock360Props {
  symbol: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Stock360Dialog({ symbol, open, onOpenChange }: Stock360Props) {
  const [data, setData] = useState<Stock360Data | null>(null)
  const [ratios, setRatios] = useState<RatioData | null>(null)
  const [financials, setFinancials] = useState<FinancialsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingRatios, setLoadingRatios] = useState(false)
  const [loadingFinancials, setLoadingFinancials] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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

  const fetchRatios = async () => {
      if (!symbol || ratios) return
      setLoadingRatios(true)
      try {
          const res = await api.getStockRatios(symbol)
          setRatios(res)
      } catch (err) {
          console.error("Failed to load ratios", err)
      } finally {
          setLoadingRatios(false)
      }
  }

  const fetchFinancials = async () => {
      if (!symbol || financials) return
      setLoadingFinancials(true)
      try {
          const res = await api.getFinancials(symbol)
          setFinancials(res)
      } catch (err) {
          console.error("Failed to load financials", err)
      } finally {
          setLoadingFinancials(false)
      }
  }

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

  const formatSafeDate = (dateStr: string, formatStr: string) => {
      try {
          if (!dateStr) return "";
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return "";
          return format(d, formatStr);
      } catch {
          return "";
      }
  }

  const formatCurrency = (val: string | number | null | undefined) => {
      if (typeof val !== 'number') return val;
      if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + "B";
      if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(2) + "M";
      return val.toLocaleString();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-background shadow-2xl">
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
            
            {/* --- HEADER --- */}
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
                        {mounted ? format(new Date(), "MMMM dd, yyyy h:mm a") : "---"} ET
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

            <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 border-b bg-muted/10">
                    <TabsList className="h-12 bg-transparent gap-6 p-0 border-none">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 border-primary rounded-none h-full px-0 text-xs font-black uppercase tracking-widest flex gap-2">
                            <IconActivity className="size-4" /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="quant" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 border-primary rounded-none h-full px-0 text-xs font-black uppercase tracking-widest flex gap-2" onClick={fetchRatios}>
                            <IconBrain className="size-4" /> Quant Insights
                        </TabsTrigger>
                        <TabsTrigger value="financials" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 border-primary rounded-none h-full px-0 text-xs font-black uppercase tracking-widest flex gap-2" onClick={fetchFinancials}>
                            <IconFileText className="size-4" /> Financials
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="flex-1 overflow-y-auto m-0 p-0 custom-scrollbar">
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
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

                            <Card className="border-border/50 bg-card/20 shadow-sm overflow-hidden">
                                <CardHeader className="py-3 border-b border-border/50 flex flex-row items-center justify-between">
                                    <CardTitle className="text-xs uppercase tracking-[0.2em] font-black text-primary">Charting</CardTitle>
                                    <Badge variant="outline" className="text-[9px] uppercase font-mono">Daily / 1Y</Badge>
                                </CardHeader>
                                <CardContent className="p-0 h-[350px]">
                                    <StockChart symbol={symbol} />
                                </CardContent>
                            </Card>

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
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </div>

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
                                            {(data.catalysts || []).map((item, idx) => (
                                                <div key={idx} className="space-y-2 border-l-2 border-primary/20 pl-3 relative">
                                                    <div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-primary" />
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] font-black uppercase text-muted-foreground">{item.source} • {formatSafeDate(item.date, "h:mm a")}</span>
                                                        <Badge variant={item.type === "SEC" ? "destructive" : "secondary"} className="text-[8px] h-3 px-1">{item.type}</Badge>
                                                    </div>
                                                    <a href={item.url} target="_blank" className="text-xs font-bold leading-tight hover:text-primary transition-colors block decoration-primary/30 underline underline-offset-2">
                                                        {item.title}
                                                    </a>
                                                    <div className="text-[9px] font-mono text-muted-foreground">
                                                        {formatSafeDate(item.date, "EEE MMM do, yyyy")}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="quant" className="flex-1 overflow-y-auto m-0 p-6 custom-scrollbar">
                    {loadingRatios ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">Running FinanceToolkit Analysis Engine...</span>
                        </div>
                    ) : (ratios && (ratios.ratios || ratios.piotroski)) ? (
                        <div className="space-y-8">
                            <Card className="border-primary/20 bg-primary/5">
                                <CardHeader className="py-3 px-5 border-b border-primary/10">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <IconFlask className="size-4" /> Piotroski F-Score (FinanceToolkit Model)
                                        </CardTitle>
                                        <Badge className="bg-primary text-primary-foreground font-black">
                                            SCORE: {ratios.piotroski ? (Object.values(ratios.piotroski)[0] || 0) : 0} / 9
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5">
                                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                                        {ratios.summary || "The Piotroski score is a discrete score between zero and nine which reflects nine criteria used to determine the strength of a firm's financial position."}
                                    </p>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(ratios.ratios || {}).map(([group, metrics]) => (
                                    <Card key={group} className="border-border/50 bg-card/30">
                                        <CardHeader className="py-2 px-4 border-b border-border/50 bg-muted/20">
                                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                <IconReportAnalytics className="size-3.5 text-primary" /> {group.replace(/_/g, ' ')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="divide-y divide-border/10">
                                                {Object.entries(metrics || {}).map(([name, val]) => (
                                                    <div key={name} className="flex justify-between items-center p-3 hover:bg-muted/30 transition-colors">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase max-w-[180px]">{name.replace(/_/g, ' ')}</span>
                                                        <span className="text-xs font-mono font-black text-foreground">
                                                            {typeof val === 'number' ? 
                                                                (val > 1000 ? (val/1e6).toFixed(2)+'M' : val.toFixed(3)) 
                                                                : String(val)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground uppercase font-black tracking-widest text-xs">
                            Insufficient Data for Deep Analysis
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="financials" className="flex-1 overflow-hidden m-0 p-0">
                    <Tabs defaultValue="income" className="h-full flex flex-col">
                        <div className="px-6 py-2 border-b bg-muted/5 flex justify-between items-center">
                            <TabsList className="bg-transparent h-8 p-0 gap-4">
                                <TabsTrigger value="income" className="text-[10px] uppercase font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 rounded-full">Income Statement</TabsTrigger>
                                <TabsTrigger value="balance" className="text-[10px] uppercase font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 rounded-full">Balance Sheet</TabsTrigger>
                                <TabsTrigger value="cash" className="text-[10px] uppercase font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 rounded-full">Cash Flow</TabsTrigger>
                            </TabsList>
                            <span className="text-[9px] font-mono text-muted-foreground uppercase">Currency: USD | Unit: Absolute</span>
                        </div>

                        {loadingFinancials ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : financials ? (
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                {(['income', 'balance', 'cash'] as const).map((type) => (
                                    <TabsContent key={type} value={type} className="m-0 p-0">
                                        <Table className="border-collapse">
                                            <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                                <TableRow className="hover:bg-transparent border-b-2">
                                                    <TableHead className="w-[250px] text-[10px] font-black uppercase text-primary bg-background">Metric (Quarterly)</TableHead>
                                                    {(financials[type] || []).map((q, idx) => (
                                                        <TableHead key={idx} className="text-right text-[10px] font-black uppercase font-mono min-w-[120px]">
                                                            {q?.date ? String(q.date) : "N/A"}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {/* DYNAMIC ROW GENERATION */}
                                                {Object.keys((financials[type] && financials[type].length > 0 ? financials[type][0] : {}))
                                                    .filter(k => !['symbol', 'date', 'updated_at', 'SimFinId', 'Currency', 'Fiscal Year', 'Fiscal Period', 'Publish Date', 'Restated Date'].includes(k))
                                                    .map((key) => (
                                                        <TableRow key={key} className="hover:bg-muted/20 transition-colors border-b border-border/10">
                                                            <TableCell className="text-[10px] font-bold text-muted-foreground uppercase py-2 bg-background/50 sticky left-0">{key}</TableCell>
                                                            {(financials[type] || []).map((q, idx) => (
                                                                <TableCell key={idx} className="text-right font-mono text-[11px] font-medium py-2">
                                                                    {q ? formatCurrency(q[key]) : "-"}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </TabsContent>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground uppercase text-xs font-black tracking-widest">
                                No Financial Records Found
                            </div>
                        )}
                    </Tabs>
                </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}