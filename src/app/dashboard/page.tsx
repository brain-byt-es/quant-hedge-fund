"use client"

import { useState, useEffect, useCallback } from "react"
import { TopHoldings } from "@/components/dashboard/top-holdings"
import { api } from "@/lib/api"
import { 
  Rocket,
  ArrowRight,
  FlaskConical,
  ShieldCheck,
  Zap,
  Activity,
  Search,
  Shield
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { 
    IconChartBar
} from "@tabler/icons-react"
import { useStock360 } from "@/components/providers/stock-360-provider"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface DashboardPosition {
  symbol: string
  quantity: number
  market_value: number
  unrealized_pnl: number
  percent_change: number
}

interface LiveStatusData {
  ib_connected: boolean
  engine_halted: boolean
  net_liquidation?: number
  daily_pnl_usd?: number
  trades_count?: number
  sharpe_ratio?: number
}

interface ScannerSignal {
    symbol: string
    change_percent: number
    catalyst: string
    rvol: number
    sector?: string
    [key: string]: unknown
}

export default function DashboardPage() {
  const [positions, setPositions] = useState<DashboardPosition[]>([])
  const [liveStatus, setLiveStatus] = useState<LiveStatusData>({ 
    ib_connected: false, 
    engine_halted: false, 
    net_liquidation: 0, 
    daily_pnl_usd: 0,
    trades_count: 0,
    sharpe_ratio: 0
  })
  const [activeSignals, setActiveSignals] = useState<ScannerSignal[]>([])
  const [mounted, setMounted] = useState(false)
  const { openStock360 } = useStock360()

  const fetchData = useCallback(async () => {
    try {
      const lStatus = await api.getLiveStatus()
      setLiveStatus(lStatus)
      
      const pos = await api.getPortfolio()
      setPositions(pos as DashboardPosition[])

      const signals = await api.getTacticalScanner()
      setActiveSignals(signals || [])
    } catch {
      console.debug("Dashboard: Backend busy, retrying...")
    }
  }, [])

  useEffect(() => {
    // Standard hydration fix: defer to ensure it happens after initial paint
    requestAnimationFrame(() => setMounted(true))
    const timer = setTimeout(() => fetchData(), 0)
    const interval = setInterval(fetchData, 10000)
    return () => {
        clearTimeout(timer)
        clearInterval(interval)
    }
  }, [fetchData])

  const handleHalt = async () => {
      await api.haltSystem()
      fetchData()
  }

  const avgFScore = 7.4 // Placeholder: In a real app, calculate from portfolio
  const marketHeat = activeSignals.length > 0 
    ? (activeSignals.reduce((acc, s) => acc + s.rvol, 0) / activeSignals.length).toFixed(1)
    : "1.0"

  const topSector = activeSignals.length > 0 
    ? (() => {
        const counts = activeSignals.reduce((acc, s) => {
            const sec = s.sector || "Mixed";
            acc[sec] = (acc[sec] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      })()
    : "Quiet"

  const formattedLiquidation = mounted 
    ? (liveStatus.net_liquidation || 100000).toLocaleString() 
    : "100,000"

  const formattedDailyPnL = mounted
    ? (liveStatus.daily_pnl_usd || 0).toLocaleString()
    : "0"

  return (
    <div className="flex flex-col gap-8 py-6">
      
      {/* 1. UNIFIED MISSION CONTROL HEADER */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* --- LEFT: QUANT SCIENCE (LONG TERM) --- */}
        <Card className="border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <FlaskConical className="size-24 text-emerald-500" />
            </div>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardDescription className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-500">Quant Science Mode</CardDescription>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[10px]">STRATEGIC</Badge>
                </div>
                <CardTitle className="text-3xl font-black tracking-tighter">Mission Control</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Portfolio Health</span>
                    <div className="text-xl font-mono font-bold text-emerald-500 flex items-center gap-2">
                        <ShieldCheck className="size-4" /> {avgFScore} <span className="text-[10px] text-muted-foreground">AVG F-SCORE</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Equity State</span>
                    <div className="text-xl font-mono font-bold text-foreground">
                        ${formattedLiquidation}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-emerald-500/10 border-t border-emerald-500/10 py-3">
                <Link href="/dashboard/research" className="w-full">
                    <Button variant="ghost" size="sm" className="w-full justify-between text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/20 px-0">
                        Enter Factor Lab <ArrowRight className="size-3" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>

        {/* --- RIGHT: TACTICAL OPS (DAYTRADING) --- */}
        <Card className="border-orange-500/20 bg-orange-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Rocket className="size-24 text-orange-500" />
            </div>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardDescription className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-500">Tactical Ops Mode</CardDescription>
                    <Badge variant="outline" className="border-orange-500/30 text-orange-500 text-[10px]">ACTIVE HUNT</Badge>
                </div>
                <CardTitle className="text-3xl font-black tracking-tighter">Market Heat</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Active Rockets</span>
                    <div className="text-xl font-mono font-bold text-orange-500 flex items-center gap-2">
                        <Zap className="size-4" /> {activeSignals.length} <span className="text-[10px] text-muted-foreground">SIGNALS</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Heat Index</span>
                    <div className="text-xl font-mono font-bold text-foreground flex items-center gap-2">
                        <Activity className="size-4 text-orange-500" /> {marketHeat}x <span className="text-[10px] text-muted-foreground uppercase">{topSector}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-orange-500/10 border-t border-orange-500/10 py-3">
                <Link href="/dashboard/tactical" className="w-full">
                    <Button variant="ghost" size="sm" className="w-full justify-between text-[10px] font-black uppercase tracking-widest text-orange-500 hover:bg-orange-500/20 px-0">
                        Enter Rocket Scanner <ArrowRight className="size-3" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>

      </section>

      {/* 2. LIVE TELEMETRY & SYSTEM STATUS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Positions & Orders (8 Cols) */}
        <div className="lg:col-span-8">
            <TopHoldings positions={positions} />
        </div>

        {/* Global Control & Metrics (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
            <Card className="border-border/50 bg-card/20 backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <IconChartBar className="size-3.5 text-primary" /> System Telemetry
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                    <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-muted-foreground uppercase tracking-tighter">Execution Node</span>
                        <Badge variant={liveStatus.ib_connected ? "default" : "destructive"} className="h-4 text-[9px] uppercase font-black px-1.5">
                            {liveStatus.ib_connected ? "STABLE" : "OFFLINE"}
                        </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-muted-foreground uppercase tracking-tighter">Daily Alpha</span>
                        <span className={cn("font-bold text-sm", (liveStatus.daily_pnl_usd || 0) >= 0 ? "text-primary" : "text-destructive")}>
                            {(liveStatus.daily_pnl_usd || 0) >= 0 ? "+" : ""}${formattedDailyPnL}
                        </span>
                    </div>
                    <Button variant={liveStatus.engine_halted ? "default" : "destructive"} size="sm" className="w-full h-8 text-[10px] font-black uppercase tracking-widest mt-2" onClick={handleHalt}>
                        {liveStatus.engine_halted ? "Resume Core Engine" : "Global Emergency Halt"}
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5 shadow-2xl relative overflow-hidden group hover:border-primary/40 transition-all cursor-pointer">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Shield className="size-20" />
                </div>
                <CardHeader className="p-5" onClick={() => window.dispatchEvent(new CustomEvent("toggle-command-menu"))}>
                    <CardTitle className="text-xs uppercase tracking-[0.2em] font-black italic text-primary flex items-center gap-2">
                        <Search className="size-3" /> Quick Intelligence
                    </CardTitle>
                    <CardDescription className="text-foreground/70 text-[11px] leading-relaxed mt-2">
                        Press <Badge variant="outline" className="h-4 px-1 text-[9px] font-mono mx-1">⌘K</Badge> to search any ticker and open the <strong>360&deg; Intelligence Card</strong> instantly.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>

      </section>

    </div>
  )
}