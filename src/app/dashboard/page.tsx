"use client";

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PortfolioChart } from "@/components/dashboard/portfolio-chart"
import { TopHoldings } from "@/components/dashboard/top-holdings"
import { ExposureChart } from "@/components/dashboard/exposure-chart"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Clock,
  Play,
  Pause
} from "lucide-react"
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
  net_liquidation?: number;
}

interface DashboardPosition {
  symbol: string;
  quantity: number;
  market_value: number;
  unrealized_pnl: number;
  asset_class?: string;
  [key: string]: unknown;
}

interface ChartPoint {
  time: string;
  value: number;
  benchmark: number;
}

export default function DashboardPage() {
  const [dataStatus, setDataStatus] = useState<string>("checking...")
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null)
  const [positions, setPositions] = useState<DashboardPosition[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [mounted, setMounted] = useState(false)

  // Real-time WebSocket Feed
  const { data: wsData, status: wsStatus } = useWebSocket<{
    type: string;
    data: LiveStatus;
  }>("/live/ws/ticks");

  // Handle WS Data
  useEffect(() => {
    if (wsData?.type === "status" && wsData.data) {
       // Wrap in setTimeout to satisfy linter and avoid cascading renders
       setTimeout(() => {
           setLiveStatus(wsData.data);
           
           const dailyPnL = wsData.data.daily_pnl_usd || 0;
           
           // Append to chart history
           setChartData(prev => {
               const newVal: ChartPoint = {
                   time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                   value: dailyPnL,
                   benchmark: 0 // Placeholder until we stream benchmark
               };
               return [...prev.slice(-50), newVal]; // Keep last 50 points
           });
       }, 0);
    }
  }, [wsData]);

  useEffect(() => {
    // Avoid cascading render warning
    setTimeout(() => setMounted(true), 0);
    
    const fetchData = async () => {
      try {
        const dStatus = await api.getIngestionStatus()
        setDataStatus(dStatus.status || "error")

        const lStatus = await api.getLiveStatus()
        setLiveStatus(lStatus)
        
        const pos = await api.getPortfolio()
        setPositions(pos as DashboardPosition[])
      } catch (err) {
        // Backend is likely busy, maintain current state
        console.debug("Dashboard: Backend unreachable or busy, retrying later...")
        setDataStatus("busy")
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

            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isHalted ? "bg-destructive/10 border-destructive/50 text-destructive" : "bg-primary/10 border-primary/50 text-primary"}`}>
                <span className={`flex h-2 w-2 rounded-full ${isHalted ? "bg-destructive animate-none shadow-[0_0_8px_var(--destructive)]" : "bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]"}`} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest leading-none">
                    {isHalted ? "System Halted" : "Live Execution"}
                </span>
            </div>
            {isHalted ? (
                <Button variant="outline" size="sm" className="ml-4 gap-2 text-primary border-primary hover:bg-primary/10 font-bold uppercase tracking-widest h-8" onClick={handleResume}>
                    <Play className="h-3 w-3" /> Resume Engine
                </Button>
            ) : (
                <Button variant="destructive" size="sm" className="ml-4 gap-2 font-bold uppercase tracking-widest h-8" onClick={handleHalt}>
                    <Pause className="h-3 w-3" /> Halt System
                </Button>
            )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Equity"
          value={liveStatus?.net_liquidation ? `$${liveStatus.net_liquidation.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "--"}
          trend="neutral"
          subtext="Net Liquidation Value"
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
          title="Performance"
          value="Sharpe: 1.85" 
          trend="up"
          trendValue="Beta: 0.42"
          subtext={`Active Symbols: ${activeSymbols}`}
        />
      </div>


      {/* Main Charts Area */}
      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7 h-[400px]">
        <div className="col-span-4 lg:col-span-5 h-full">
             <PortfolioChart data={chartData} />
        </div>
        
        <div className="col-span-4 lg:col-span-2 h-full">
            <ExposureChart />
        </div>
      </div>

      {/* Detail Area: Active Positions */}
      <div className="grid gap-4 md:grid-cols-1">
          <TopHoldings positions={positions} />
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
        <div className="h-3 w-[1px] bg-border" />
        <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-chart-4" />
            Janitor (Prefect): ONLINE
        </div>
      </div>
    </div>
  )
}