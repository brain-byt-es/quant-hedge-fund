"use client";

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PortfolioChart } from "@/components/dashboard/portfolio-chart"
import { TopHoldings } from "@/components/dashboard/top-holdings"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Power, Play } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LiveStatus {
  latency_p50_ms?: number;
  engine_halted?: boolean;
  active_symbols?: string[];
  daily_pnl_usd?: number;
  portfolio_var_95_usd?: number;
  portfolio_es_95_usd?: number;
  active_broker?: string;
  ib_connected?: boolean;
}

export default function DashboardPage() {
  const [dataStatus, setDataStatus] = useState<string>("checking...")
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null)
  const [mounted, setMounted] = useState(false)

  // Real-time WebSocket Feed
  const { status: wsStatus } = useWebSocket<{
    type: string;
    data: unknown;
  }>("/live/ws/ticks");

  useEffect(() => {
    // Avoid cascading render warning
    Promise.resolve().then(() => setMounted(true));
    
    const fetchData = async () => {
      try {
        const dStatus = await api.getIngestionStatus()
        setDataStatus(dStatus.status || "error")

        const lStatus = await api.getLiveStatus()
        setLiveStatus(lStatus)
      } catch (e) {
        console.error("Failed to fetch dashboard data", e)
        setDataStatus("offline")
        setLiveStatus({ ib_connected: false, engine_halted: false })
      }
    }
    fetchData()
    // Poll slower for non-critical status, rely on WS for ticks
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  // Handle System Controls
  const handleHalt = async () => {
      if (confirm("EMERGENCY HALT: Stop all trading?")) {
          await api.haltSystem();
          // Optimistic update
          setLiveStatus((prev: LiveStatus | null) => ({ ...prev, engine_halted: true }));
      }
  }

  const handleResume = async () => {
      if (confirm("Resume trading operations?")) {
          await api.resumeSystem();
          setLiveStatus((prev: LiveStatus | null) => ({ ...prev, engine_halted: false }));
      }
  }

  const handleBrokerChange = async (value: string) => {
      try {
          await api.configureBroker(value);
          setLiveStatus((prev: LiveStatus | null) => ({ ...prev, active_broker: value }));
      } catch {
          alert("Failed to switch broker. Check backend logs.");
      }
  }

  if (!mounted) return null

  // Derived Metrics from WS or Polling
  const latency = liveStatus?.latency_p50_ms ? `${liveStatus.latency_p50_ms.toFixed(1)}ms` : "--"
  const isHalted = liveStatus?.engine_halted || false
  const activeSymbols = liveStatus?.active_symbols?.length || 0
  const activeBroker = liveStatus?.active_broker || "ALPACA"
  
  // WS Data Parsing (Daily P&L)
  const dailyPnL = liveStatus?.daily_pnl_usd || 0.0;

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header with Admin Link */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
        <div className="flex gap-3 items-center">
            {/* Broker Toggle */}
            <Select value={activeBroker} onValueChange={handleBrokerChange}>
                <SelectTrigger className="w-[140px] h-9 bg-background border-border/50">
                    <SelectValue placeholder="Broker" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALPACA">Alpaca (Paper)</SelectItem>
                    <SelectItem value="IBKR">IBKR (Live/Paper)</SelectItem>
                </SelectContent>
            </Select>

            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isHalted ? "bg-red-500/10 border-red-500 text-red-500" : "bg-emerald-500/10 border-emerald-500 text-emerald-500"}`}>
                <span className={`flex h-2 w-2 rounded-full ${isHalted ? "bg-red-500 animate-none" : "bg-emerald-500 animate-pulse"}`} />
                <span className="text-sm font-medium">{isHalted ? "SYSTEM HALTED" : "SYSTEM NORMAL"}</span>
            </div>
            
            {isHalted ? (
                <Button variant="outline" size="sm" className="ml-4 gap-2 text-emerald-500 border-emerald-500 hover:bg-emerald-500/10" onClick={handleResume}>
                    <Play className="h-4 w-4" />
                    Resume
                </Button>
            ) : (
                <Button variant="outline" size="sm" className="ml-4 gap-2 text-red-500 border-red-500 hover:bg-red-500/10" onClick={handleHalt}>
                    <Power className="h-4 w-4" />
                    Emergency Halt
                </Button>
            )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total P&L"
          value="$1,245,302.50"
          trend="up"
          trendValue="+12.4%"
          subtext="Inception to Date"
        />
        <MetricCard
          title="Daily P&L"
          value={dailyPnL >= 0 ? `+${dailyPnL.toFixed(2)}` : `-${Math.abs(dailyPnL).toFixed(2)}`}
          trend={dailyPnL >= 0 ? "up" : "down"}
          trendValue="Live"
          subtext="Real-time"
          isLive={true}
        />
        <MetricCard
          title="Risk Metrics"
          value={liveStatus?.portfolio_var_95_usd ? `${liveStatus.portfolio_var_95_usd.toFixed(0)}` : "--"}
          trend="neutral"
          subtext="VaR (95%)"
          trendValue={`ES: ${liveStatus?.portfolio_es_95_usd ? liveStatus.portfolio_es_95_usd.toFixed(0) : "--"}`}
        />
        <MetricCard
          title="Live Model"
          value="PROD-ALPHA-V4"
          trend="neutral"
          subtext={`Active Symbols: ${activeSymbols}`}
        />
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7 h-[500px]">
        <div className="col-span-4 lg:col-span-5 h-full">
             <PortfolioChart />
        </div>
        
        <div className="col-span-4 lg:col-span-2 h-full">
            <TopHoldings />
        </div>
      </div>
      
      {/* Footer / Status Bar (Visual Only) */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div>Data Engine: {dataStatus.toUpperCase()}</div>
        <div className="h-3 w-[1px] bg-border" />
        <div>IBKR Gateway: {liveStatus?.ib_connected ? "CONNECTED" : "DISCONNECTED"}</div>
        <div className="h-3 w-[1px] bg-border" />
        <div>Execution Latency: {latency}</div>
        <div className="h-3 w-[1px] bg-border" />
        <div>Stream: {wsStatus.toUpperCase()}</div>
      </div>
    </div>
  )
}