"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { Loader2, Rocket, TrendingUp, AlertTriangle, Zap, Activity, RefreshCw, CheckCircle2, Calendar as CalendarIcon, X, ExternalLink, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Stock360Dialog } from "@/components/research/stock-360-dialog"

interface RocketSignal {
  symbol: string
  price: number
  change_percent: number
  gap_percent?: number
  volume: number
  rvol: number
  market_cap: number
  float_shares?: number
  match_score?: number
  catalyst: string
  catalyst_url?: string
  sector?: string
  timestamp: string
}

export default function TacticalPage() {
  const [signals, setSignals] = useState<RocketSignal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [date, setDate] = useState<Date | undefined>(undefined)
  
  // Stock 360 Modal State
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const fetchSignals = useCallback(async () => {
    setIsLoading(true)
    try {
      const dateStr = date ? format(date, "yyyy-MM-dd") : undefined
      const data = await api.getTacticalScanner(2.0, 20.0, 10.0, dateStr)
      if (Array.isArray(data)) {
        setSignals(data)
        if (dateStr) {
            toast.success(`Analysis Complete: ${data.length} rockets found for ${dateStr}`)
        }
      } else {
        setSignals([])
      }
      setLastUpdated(new Date())
    } catch (e) {
      console.error("Scanner failed", e)
      setSignals([])
      toast.error("Scanner failed to fetch data.")
    } finally {
      setIsLoading(false)
    }
  }, [date])

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol)
    setIsDialogOpen(true)
  }

  // Auto-refresh every 30s (only if live mode)
  useEffect(() => {
    fetchSignals()
    if (!date) {
        const interval = setInterval(fetchSignals, 30000)
        return () => clearInterval(interval)
    }
  }, [fetchSignals, date])

  return (
    <TooltipProvider>
    <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Rocket className="h-8 w-8 text-orange-500" />
            Tactical Momentum Hub
          </h2>
          <p className="text-muted-foreground">
            {date ? `Historical Analysis: ${format(date, "PPP")}` : "Real-time scanner for Small-Cap Low-Float Momentum setups."}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Live / Auto-Weekend</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              />
            </PopoverContent>
          </Popover>
          
          {date && (
              <Button variant="ghost" size="icon" onClick={() => setDate(undefined)} title="Return to Live">
                  <X className="h-4 w-4" />
              </Button>
          )}

          <Badge variant="outline" className="h-8 px-3 font-mono">
            {lastUpdated ? lastUpdated.toLocaleTimeString() : "Syncing..."}
          </Badge>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => fetchSignals()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Momentum Leaderboard - Main Section */}
        <Card className="col-span-4 border-orange-500/20 shadow-lg shadow-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Momentum Leaderboard
            </CardTitle>
            <CardDescription>
              Live Gap-Up & Volume Scans ($2-$20, Low Float)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signals.length === 0 && !isLoading ? (
              <div className="text-center py-10 text-muted-foreground">
                No active rockets found {date ? `for ${format(date, "PPP")}` : "at this moment"}. <br/>
                <span className="text-xs opacity-50">Try selecting a different historical date (e.g. last Friday).</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Symbol</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Gap %</TableHead>
                    <TableHead>RVOL</TableHead>
                    <TableHead>Float</TableHead>
                    <TableHead>Catalyst</TableHead>
                    <TableHead className="text-right">Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && signals.length === 0 ? (
                    <TableRow>
                       <TableCell colSpan={7} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500" />
                       </TableCell>
                    </TableRow>
                  ) : (
                    signals.map((signal) => (
                      <TableRow key={signal.symbol} className="group cursor-pointer hover:bg-orange-500/5">
                        <TableCell onClick={() => handleSymbolClick(signal.symbol)} className="hover:text-primary transition-colors cursor-pointer">
                            <div className="flex items-center gap-1">
                                <div className="font-bold font-mono text-lg">{signal.symbol}</div>
                                <Info className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                                +{signal.change_percent.toFixed(1)}%
                            </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold">${signal.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`font-mono font-bold ${signal.gap_percent && signal.gap_percent > 4 ? "text-green-500" : "text-muted-foreground"}`}>
                            {signal.gap_percent ? `+${signal.gap_percent.toFixed(1)}%` : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                            <Badge variant={signal.rvol > 10 ? "destructive" : "secondary"} className="font-mono font-bold">
                                {signal.rvol.toFixed(1)}x {signal.rvol > 10 && "🔥"}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-mono text-xs">
                                    {signal.float_shares ? `${(signal.float_shares / 1e6).toFixed(1)}M` : "-"}
                                </span>
                                {signal.float_shares && signal.float_shares < 10e6 && (
                                    <span className="text-[9px] text-orange-500 font-bold uppercase tracking-tighter">Low Float</span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {signal.catalyst_url ? (
                                        <a 
                                            href={signal.catalyst_url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="max-w-[150px] truncate text-xs text-muted-foreground underline decoration-dotted hover:text-primary transition-colors block"
                                        >
                                            {signal.catalyst || "No News"}
                                        </a>
                                    ) : (
                                        <span className="max-w-[150px] truncate text-xs text-muted-foreground block cursor-default">
                                            {signal.catalyst || "No News"}
                                        </span>
                                    )}
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="flex flex-col gap-2 max-w-xs">
                                        <p className="text-xs font-bold">{signal.catalyst}</p>
                                        {signal.catalyst_url && (
                                            <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase">
                                                <ExternalLink className="h-3 w-3" /> View Article
                                            </div>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 text-green-500 font-mono font-bold">
                                <CheckCircle2 className="h-4 w-4" />
                                {signal.match_score || 5}/5
                            </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right Column Widgets */}
        <div className="col-span-3 space-y-4">
          
          {/* Catalyst Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <Zap className="h-4 w-4 text-yellow-500" />
                Catalyst Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {signals.filter(s => s.catalyst && s.catalyst !== "-").map((signal, i) => (
                    <div key={i} className="flex flex-col gap-1 border-b border-border/50 pb-3 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-orange-500">{signal.symbol}</span>
                        <span className="text-[10px] text-muted-foreground">{(signal.rvol).toFixed(1)}x Vol</span>
                      </div>
                      {signal.catalyst_url ? (
                          <a 
                            href={signal.catalyst_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-sm font-medium leading-none hover:text-primary transition-colors flex items-start gap-1 group"
                          >
                            {signal.catalyst}
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                          </a>
                      ) : (
                          <p className="text-sm font-medium leading-none text-foreground/80">
                            {signal.catalyst}
                          </p>
                      )}
                    </div>
                  ))}
                  {signals.length === 0 && (
                    <div className="text-xs text-muted-foreground italic">No active catalysts detected.</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Float & Stats Check */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Avg RVOL
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black font-mono">
                  {signals.length > 0 
                    ? (signals.reduce((acc, s) => acc + s.rvol, 0) / signals.length).toFixed(1) + "x"
                    : "-"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Hot Sector
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold truncate">
                  {signals.length > 0 
                    ? (() => {
                        const sectors = signals.map(s => s.sector || "Unknown");
                        const counts = sectors.reduce((acc, val) => {
                            acc[val] = (acc[val] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>);
                        const topSector = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "N/A");
                        return topSector !== "Unknown" ? topSector : "Mixed";
                      })()
                    : "N/A"}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Stock360Dialog 
        symbol={selectedSymbol} 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />

    </div>
    </TooltipProvider>
  )
}
