"use client"

import { useState, useEffect, useCallback } from "react"
import { TopHoldings } from "@/components/dashboard/top-holdings"
import { ExposureChart } from "@/components/dashboard/exposure-chart"
import { PortfolioChart } from "@/components/dashboard/portfolio-chart"
import { api } from "@/lib/api"
import { 
  Clock,
} from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { 
    IconTrendingUp, 
    IconActivity, 
    IconShield, 
    IconBolt,
    IconChartBar
} from "@tabler/icons-react"

interface DashboardPosition {
  symbol: string
  quantity: number
  market_value: number
  unrealized_pnl: number
  percent_change: number
}

export default function DashboardPage() {
  const [positions, setPositions] = useState<DashboardPosition[]>([])
  const [liveStatus, setLiveStatus] = useState({ ib_connected: false, engine_halted: false })
  const [, setDataStatus] = useState("connected")
  const { status: wsStatus } = useWebSocket("/live/ws/status")

  const fetchData = useCallback(async () => {
    try {
      const dStatus = await api.getIngestionStatus()
      setDataStatus(dStatus.status || "error")

      const lStatus = await api.getLiveStatus()
      setLiveStatus(lStatus)
      
      const pos = await api.getPortfolio()
      setPositions(pos as DashboardPosition[])
    } catch {
      console.debug("Dashboard: Backend busy, retrying...")
      setDataStatus("busy")
    }
  }, [])

  useEffect(() => {
    const init = async () => {
        await fetchData()
    }
    init()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleHalt = async () => {
      await api.haltSystem()
      fetchData()
  }

  const handleResume = async () => {
      await api.resumeSystem()
      fetchData()
  }

  const isHalted = liveStatus.engine_halted

  return (
    <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6">
      
      {/* 1. TOP METRICS (SaaS Style) */}
      <div className="grid grid-cols-1 gap-4 px-0 md:grid-cols-2 lg:grid-cols-4">
        <Card className="@container/card bg-gradient-to-t from-primary/5 to-card border-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-widest font-bold opacity-70">Total Equity</CardDescription>
            <CardTitle className="text-2xl font-black tabular-nums font-mono tracking-tighter">
              $1,248,592.42
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary font-bold">
                <IconTrendingUp className="size-3 mr-1" /> +2.4%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="pt-0 flex flex-row items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
             <Clock className="size-3" /> Last Calc: Just Now
          </CardFooter>
        </Card>

        <Card className="@container/card border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-widest font-bold opacity-70">Daily P&L</CardDescription>
            <CardTitle className="text-2xl font-black tabular-nums font-mono tracking-tighter text-primary">
              +$14,205.18
            </CardTitle>
            <CardAction>
              <IconBolt className="size-4 text-primary animate-pulse" />
            </CardAction>
          </CardHeader>
          <CardFooter className="pt-0 flex flex-row items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
             <IconActivity className="size-3" /> Realtime Feed Active
          </CardFooter>
        </Card>

        <Card className="@container/card border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-widest font-bold opacity-70">Sharpe Ratio</CardDescription>
            <CardTitle className="text-2xl font-black tabular-nums font-mono tracking-tighter">
              2.84
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="border-chart-3/20 bg-chart-3/5 text-chart-3 font-bold">
                Institutional
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="pt-0 flex flex-row items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
             <IconShield className="size-3" /> Risk Adjusted OK
          </CardFooter>
        </Card>

        <Card className="@container/card border-border/50 shadow-sm overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-widest font-bold opacity-70">Engine Status</CardDescription>
            <div className="flex items-center gap-3">
                <CardTitle className="text-xl font-black uppercase italic tracking-tighter">
                  {isHalted ? "Halted" : "Active"}
                </CardTitle>
                <div className={`h-2 w-2 rounded-full ${isHalted ? "bg-destructive shadow-[0_0_8px_var(--destructive)]" : "bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]"}`} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
             {isHalted ? (
                <Button size="sm" variant="outline" className="h-7 text-[10px] w-full font-black border-primary text-primary hover:bg-primary/10" onClick={handleResume}>
                    RESUME TRADING
                </Button>
             ) : (
                <Button size="sm" variant="destructive" className="h-7 text-[10px] w-full font-black" onClick={handleHalt}>
                    EMERGENCY HALT
                </Button>
             )}
          </CardContent>
        </Card>
      </div>

      {/* 2. MAIN CHARTS AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Performance Chart (8 Cols) */}
        <div className="lg:col-span-8">
            <PortfolioChart />
        </div>

        {/* Exposure Distribution (4 Cols) */}
        <div className="lg:col-span-4">
            <ExposureChart />
        </div>

      </div>

      {/* 3. HOLDINGS & SYSTEM STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top Holdings Table (8 Cols) */}
        <div className="lg:col-span-8 h-full">
            <TopHoldings positions={positions} />
        </div>

        {/* Real-time Telemetry (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
            <Card className="flex-1 border-border/50 bg-card/20 backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <IconChartBar className="size-3.5 text-primary" /> System Telemetry
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                    <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-muted-foreground uppercase">IBKR Link</span>
                        <Badge variant={liveStatus.ib_connected ? "default" : "destructive"} className="h-4 text-[9px] uppercase font-black">
                            {liveStatus.ib_connected ? "Stable" : "Lost"}
                        </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-muted-foreground uppercase">DuckDB OLAP</span>
                        <Badge variant="outline" className="h-4 text-[9px] uppercase font-black border-primary/30 text-primary">
                            Connected
                        </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-muted-foreground uppercase">WebSocket</span>
                        <div className="flex items-center gap-1.5">
                            <div className="h-1 w-1 rounded-full bg-primary animate-ping" />
                            <span className="text-[10px] text-foreground font-black uppercase tracking-tighter">{wsStatus}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/50 bg-primary text-primary-foreground shadow-2xl">
                <CardHeader className="p-4">
                    <CardTitle className="text-xs uppercase tracking-[0.2em] font-black italic">Alpha Intelligence</CardTitle>
                    <CardDescription className="text-primary-foreground/70 text-[10px] leading-relaxed">
                        Supervisor Agent is scanning the tech sector for momentum clusters. 
                        New hypothesis available in AI Lab.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>

      </div>

    </div>
  )
}