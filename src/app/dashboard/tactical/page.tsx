"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { 
  Rocket, 
  Zap, 
  Activity, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  Flame,
  History,
  Plus,
  X,
  AlertTriangle,
  Info,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StockChart } from "@/components/research/stock-chart"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useWatchlist } from "@/components/providers/watchlist-provider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useStock360 } from "@/components/providers/stock-360-provider"
import { useTrading } from "@/components/providers/trading-provider"

interface ScannerSignal {
  symbol: string
  price: number
  change_percent: number
  volume: number
  rvol: number
  float_shares: number
  vwap?: number
  day_high?: number
  catalyst: string
  catalyst_url?: string
  sector: string
  timestamp: string
}

export default function TacticalTerminalPage() {
  const [activeScanner, setActiveScanner] = useState("low_float_rocket")
  const [signals, setSignals] = useState<ScannerSignal[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [highAlerts, setHighAlerts] = useState<Record<string, boolean>>({})
  
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { openStock360 } = useStock360()
  const { openOrder } = useTrading()

  const fetchSignals = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getTacticalScanner(1.0, 50.0, 5.0, undefined, activeScanner)
      setSignals(data || [])
      if (data && data.length > 0 && !selectedSymbol) {
          setSelectedSymbol(data[0].symbol)
      }
    } catch {
      toast.error("Terminal link interrupted.")
    } finally {
      setIsLoading(false)
    }
  }, [activeScanner, selectedSymbol])

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 15000)
    return () => clearInterval(interval)
  }, [fetchSignals])

  // Alerting logic: Flash gold if Price > Prev Day High (Session High Alert)
  useEffect(() => {
    const newAlerts: Record<string, boolean> = {}
    watchlist.forEach(item => {
        if (item.day_high && item.price >= item.day_high) {
            newAlerts[item.symbol] = true
        }
    })
    setHighAlerts(newAlerts)
    const timer = setTimeout(() => setHighAlerts({}), 2000)
    return () => clearTimeout(timer)
  }, [watchlist])

  const selectedData = [...signals, ...watchlist].find(s => s.symbol === selectedSymbol)

  const formatLarge = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + "B"
    if (num >= 1e6) return (num / 1e6).toFixed(1) + "M"
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K"
    return num?.toFixed(0) || "0"
  }

  const renderTable = (data: ScannerSignal[], type: 'screener' | 'watchlist') => (
    <Table>
        <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow className="hover:bg-transparent h-8 border-b border-border/50">
                <TableHead className="w-8 px-2 text-center text-[9px] font-black uppercase">Add</TableHead>
                <TableHead className="text-[9px] uppercase font-black px-2">Symbol</TableHead>
                <TableHead className="text-[9px] uppercase font-black px-2">Price</TableHead>
                <TableHead className="text-[9px] uppercase font-black px-2">Chg%</TableHead>
                <TableHead className="text-[9px] uppercase font-black px-2">RVOL</TableHead>
                <TableHead className="text-[9px] uppercase font-black px-2">Float</TableHead>
                <TableHead className="text-[9px] uppercase font-black px-2">Catalyst</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.map((s) => {
                const isOverVWAP = s.vwap && s.price > s.vwap
                const isLowFloat = s.float_shares < 5_000_000
                const isHighAlert = highAlerts[s.symbol]

                return (
                    <TableRow 
                        key={s.symbol} 
                        className={cn(
                            "cursor-pointer group h-10 border-b border-border/20 transition-all",
                            selectedSymbol === s.symbol ? "bg-primary/10" : "hover:bg-muted/30",
                            isHighAlert && "bg-yellow-500/20 animate-pulse border-y-yellow-500/50"
                        )}
                        onClick={() => {
                            setSelectedSymbol(s.symbol);
                            api.getStock360(s.symbol); // Pre-fetch 360 in background
                        }}
                    >
                        <TableCell className="p-0 text-center">
                            {type === 'screener' ? (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    onClick={(e) => { e.stopPropagation(); addToWatchlist(s) }}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            ) : (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => { e.stopPropagation(); removeFromWatchlist(s.symbol) }}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </TableCell>
                        <TableCell className="px-2 font-black font-mono text-sm">
                            <span className={cn(selectedSymbol === s.symbol && "text-orange-500")}>{s.symbol}</span>
                        </TableCell>
                        <TableCell className={cn("px-2 font-mono text-xs font-bold", isOverVWAP ? "text-green-400" : "text-foreground")}>
                            ${s.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-2">
                            <Badge className={cn(
                                "h-5 text-[10px] font-black border-none",
                                s.change_percent > 10 ? "bg-green-600 text-white" : 
                                s.change_percent > 4 ? "bg-green-500/20 text-green-400 border border-green-500/30" : 
                                s.change_percent < 0 ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                            )}>
                                {s.change_percent >= 0 ? "+" : ""}{s.change_percent.toFixed(1)}%
                            </Badge>
                        </TableCell>
                        <TableCell className="px-2 min-w-[60px]">
                            <div className="flex flex-col gap-1">
                                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className={cn(
                                            "h-full transition-all",
                                            s.rvol > 10 ? "bg-destructive animate-pulse" : 
                                            s.rvol > 5 ? "bg-orange-500" : "bg-primary"
                                        )} 
                                        style={{ width: `${Math.min(s.rvol * 10, 100)}%` }} 
                                    />
                                </div>
                                <span className="text-[9px] font-mono opacity-70">{s.rvol.toFixed(1)}x</span>
                            </div>
                        </TableCell>
                        <TableCell className={cn("px-2 font-mono text-[10px]", isLowFloat && "text-red-500 font-bold")}>
                            <div className="flex items-center gap-1">
                                {formatLarge(s.float_shares)}
                                {isLowFloat && <AlertTriangle className="h-2.5 w-2.5" />}
                            </div>
                        </TableCell>
                        <TableCell className="px-2 max-w-[120px]">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="text-[10px] truncate text-muted-foreground italic">&ldquo;{s.catalyst}&rdquo;</div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[300px] p-3 bg-card border-border shadow-2xl">
                                        <p className="text-xs font-bold leading-relaxed">{s.catalyst}</p>
                                        {s.catalyst_url && (
                                            <div className="mt-2 text-[9px] text-primary flex items-center gap-1 font-black uppercase">
                                                <ExternalLink className="h-2.5 w-2.5" /> View Source
                                            </div>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </TableCell>
                    </TableRow>
                )
            })}
        </TableBody>
    </Table>
  )

  return (
    <div className="h-[calc(100vh-4.5rem)] flex flex-col overflow-hidden bg-background text-foreground">
      
      {/* TERMINAL HEADER */}
      <header className="h-12 border-b border-border/50 bg-card/20 backdrop-blur-md flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-orange-500" />
                <h1 className="text-xs font-black uppercase italic tracking-tighter">Tactical Command</h1>
            </div>
            <div className="flex items-center gap-4 font-mono text-[9px] font-bold">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/50">
                    <span className="text-muted-foreground uppercase opacity-50 text-[8px]">SPY</span>
                    <span className="text-primary">+0.42%</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/50">
                    <span className="text-muted-foreground uppercase opacity-50 text-[8px]">QQQ</span>
                    <span className="text-primary">+0.85%</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] font-black text-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                <div className="h-1 w-1 rounded-full bg-orange-500 shadow-[0_0_8px_var(--orange-500)]" />
                LIVE TACTICAL FEED
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchSignals}>
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
        </div>
      </header>

      {/* TERMINAL BODY */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          
          {/* LEFT PANEL: SCANNER & WATCHLIST */}
          <ResizablePanel defaultSize={30} minSize={20} className="bg-card/5 border-r border-border/50">
            <ResizablePanelGroup direction="vertical">
                <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="h-full flex flex-col">
                        <div className="p-3 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" /> Live Scanners
                            </span>
                            <Tabs value={activeScanner} onValueChange={setActiveScanner} className="w-fit">
                                <TabsList className="h-7 bg-background border border-border/50 p-0.5">
                                    <TabsTrigger value="low_float_rocket" className="text-[8px] px-2 h-6 uppercase font-bold">Rockets</TabsTrigger>
                                    <TabsTrigger value="top_gainers" className="text-[8px] px-2 h-6 uppercase font-bold">Gainers</TabsTrigger>
                                    <TabsTrigger value="halt_alerts" className="text-[8px] px-2 h-6 uppercase font-bold">Halts</TabsTrigger>
                                    <TabsTrigger value="reversal_scanner" className="text-[8px] px-2 h-6 uppercase font-bold">Reversal</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <ScrollArea className="flex-1 custom-scrollbar">
                            {renderTable(signals, 'screener')}
                        </ScrollArea>
                    </div>
                </ResizablePanel>
                
                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={40} minSize={20}>
                    <div className="h-full flex flex-col border-t border-border/50">
                        <div className="p-3 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Activity className="h-3 w-3" /> Action Watchlist
                            </span>
                            <Badge variant="outline" className="text-[8px] font-mono h-5 px-1.5">{watchlist.length} TICKERS</Badge>
                        </div>
                        <ScrollArea className="flex-1 custom-scrollbar">
                            {renderTable(watchlist as ScannerSignal[], 'watchlist')}
                        </ScrollArea>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* CENTER PANEL: CHART & EXECUTION */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <ResizablePanelGroup direction="vertical">
                <ResizablePanel defaultSize={70} minSize={40} className="bg-background relative overflow-hidden">
                    {selectedSymbol ? (
                        <div className="h-full flex flex-col">
                            {/* HUD OVERLAY */}
                            <div className="absolute top-4 left-6 z-10 flex items-center gap-4 bg-background/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-border/50 shadow-2xl ring-1 ring-white/5">
                                <div className="flex flex-col" onClick={() => openStock360(selectedSymbol)} role="button">
                                    <span className="text-2xl font-black font-mono tracking-tighter hover:text-primary transition-colors cursor-pointer">{selectedSymbol}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase font-black flex items-center gap-1">
                                        {activeScanner.replace(/_/g, " ")} <Info className="h-2 w-2" />
                                    </span>
                                </div>
                                <div className="h-10 w-[1px] bg-border/50 mx-1" />
                                <div className="flex flex-col items-end min-w-[80px]">
                                    <span className={cn("text-xl font-black font-mono leading-none", (selectedData?.change_percent || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                                        {(selectedData?.change_percent || 0) >= 0 ? "+" : ""}{(selectedData?.change_percent || 0).toFixed(2)}%
                                    </span>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Intraday</span>
                                </div>
                            </div>
                            
                            <div className="flex-1">
                                <StockChart symbol={selectedSymbol} interval="1m" />
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center flex-col gap-4 text-muted-foreground/30">
                            <Search className="h-16 w-16 opacity-10 animate-pulse" />
                            <p className="text-[10px] uppercase font-black tracking-[0.3em]">Initialize Terminal Link</p>
                        </div>
                    )}
                </ResizablePanel>
                
                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={30} minSize={20} className="bg-card/5 p-4">
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4 border-b border-border/30 pb-2">
                            <div className="flex items-center gap-2">
                                <Zap className="h-3 w-3 text-primary animate-pulse" />
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Execution Singleton</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                    <span className="text-[8px] font-black uppercase text-muted-foreground">IBKR Link: OK</span>
                                </div>
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black">READY</Badge>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        className="h-12 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest flex flex-col shadow-[0_0_20px_rgba(22,163,74,0.2)] border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                                        onClick={() => selectedSymbol && openOrder(selectedSymbol, 'BUY')}
                                        disabled={!selectedSymbol}
                                    >
                                        <span>BUY MKT</span>
                                        <span className="text-[8px] opacity-70">CONFIRM OMEGA</span>
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        className="h-12 font-black uppercase tracking-widest flex flex-col border-b-4 border-red-900 active:border-b-0 active:translate-y-1 transition-all"
                                        onClick={() => selectedSymbol && openOrder(selectedSymbol, 'SELL')}
                                        disabled={!selectedSymbol}
                                    >
                                        <span>SELL MKT</span>
                                        <span className="text-[8px] opacity-70">FLATTEN</span>
                                    </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    <Button variant="outline" className="h-7 text-[8px] font-black uppercase border-border/50 hover:bg-primary/5">Limit</Button>
                                    <Button variant="outline" className="h-7 text-[8px] font-black uppercase border-border/50 hover:bg-primary/5">Stop</Button>
                                    <Button variant="outline" className="h-7 text-[8px] font-black uppercase border-border/50 hover:bg-primary/5 text-destructive">Cancel</Button>
                                </div>
                            </div>
                            <div className="bg-black/20 rounded-xl border border-border/50 p-3 flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Order Blotter</h4>
                                    <History className="h-2.5 w-2.5 text-muted-foreground opacity-30" />
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                    <p className="text-[9px] font-mono text-muted-foreground/40 italic">Awaiting execution signal...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT PANEL: INTELLIGENCE & NEWS */}
          <ResizablePanel defaultSize={25} minSize={20} className="bg-card/10 border-l border-border/50">
            <div className="h-full flex flex-col">
                <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Flame className="h-3.5 w-3.5 text-orange-500" /> Catalyst Feed
                    </h3>
                    {selectedData?.float_shares && selectedData.float_shares < 5_000_000 && (
                        <Badge className="bg-red-600 hover:bg-red-500 animate-pulse text-[8px] font-black uppercase tracking-tighter shadow-[0_0_10px_rgba(220,38,38,0.3)]">V-FLOAT</Badge>
                    )}
                </div>
                
                <div className="p-4 space-y-6 flex-1 flex flex-col overflow-hidden">
                    {/* STATS HUD */}
                    <div className="grid grid-cols-2 gap-3 shrink-0">
                        <div className={cn(
                            "p-3 rounded-xl border transition-all bg-background shadow-inner",
                            (selectedData?.float_shares || 0) < 5_000_000 ? "border-red-500/50 ring-1 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-border/50"
                        )}>
                            <span className="text-[8px] font-black text-muted-foreground uppercase block mb-1 tracking-widest opacity-50">Float</span>
                            <div className="flex items-center justify-between">
                                <span className={cn(
                                    "text-lg font-black font-mono",
                                    (selectedData?.float_shares || 0) < 5_000_000 ? "text-red-500" : "text-foreground"
                                )}>
                                    {selectedData?.float_shares ? formatLarge(selectedData.float_shares) : "---"}
                                </span>
                                {(selectedData?.float_shares || 0) < 5_000_000 && <AlertTriangle className="h-3 w-3 text-red-500 animate-bounce" />}
                            </div>
                        </div>
                        <div className="p-3 rounded-xl border border-border/50 bg-background shadow-inner">
                            <span className="text-[8px] font-black text-muted-foreground uppercase block mb-1 tracking-widest opacity-50">RVOL</span>
                            <span className="text-lg font-black font-mono text-primary">
                                {selectedData?.rvol ? selectedData.rvol.toFixed(1) + "x" : "---"}
                            </span>
                        </div>
                    </div>

                    {/* LIVE NEWS STREAM */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Zap className="h-3 w-3 text-yellow-500" />
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active News Cluster</span>
                        </div>
                        <ScrollArea className="flex-1 pr-4 custom-scrollbar">
                            <div className="space-y-4">
                                {selectedData?.catalyst && selectedData.catalyst !== "-" ? (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 group hover:border-primary/30 transition-all cursor-pointer">
                                            <div className="flex items-center justify-between mb-3">
                                                <Badge variant="outline" className="text-[8px] border-primary/20 text-primary font-black uppercase tracking-tighter">Catalyst Hub</Badge>
                                                <span className="text-[8px] font-mono text-muted-foreground/50">LIVE SIGNAL</span>
                                            </div>
                                            <p className="text-xs font-bold leading-relaxed mb-4 italic text-foreground/90">
                                                &ldquo;{selectedData.catalyst}&rdquo;
                                            </p>
                                            <div className="pt-3 border-t border-border/20 flex justify-between items-center">
                                                <a href={selectedData.catalyst_url} target="_blank" className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1.5">
                                                    Read Full Analysis <ExternalLink className="h-2.5 w-2.5" />
                                                </a>
                                            </div>
                                        </div>
                                        
                                        {/* PLACEHOLDER HISTORICAL ITEMS */}
                                        <div className="space-y-3 opacity-30 pointer-events-none">
                                            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Historical context</div>
                                            <div className="h-16 rounded-xl bg-muted/20 border border-border/30" />
                                            <div className="h-16 rounded-xl bg-muted/20 border border-border/30" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 flex flex-col items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
                                            <History className="h-6 w-6 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-widest">No Active News for {selectedSymbol || "NULL"}</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* BOTTOM RISK HUD */}
                <div className="p-4 border-t border-border/50 bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500">Risk Perimeter</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-muted-foreground uppercase opacity-50 text-[8px]">Volatility Status</span>
                            <span className="font-bold text-primary px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">STABLE</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-muted-foreground uppercase opacity-50 text-[8px]">Open Exposure</span>
                            <span className="font-bold text-foreground">$0.00</span>
                        </div>
                    </div>
                </div>
            </div>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>

    </div>
  )
}
