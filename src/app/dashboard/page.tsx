"use client";

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PortfolioChart } from "@/components/dashboard/portfolio-chart"
import { TopHoldings } from "@/components/dashboard/top-holdings"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

export default function DashboardPage() {
  const [dataStatus, setDataStatus] = useState<string>("checking...")
  const [liveStatus, setLiveStatus] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const fetchData = async () => {
      try {
        const dStatus = await api.getIngestionStatus()
        setDataStatus(dStatus.status || "error")

        const lStatus = await api.getLiveStatus()
        setLiveStatus(lStatus)
      } catch (e) {
        console.error("Failed to fetch dashboard data", e)
        setDataStatus("offline")
        setLiveStatus({ error: "offline" })
      }
    }
    fetchData()
    // Poll every 5 seconds
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  // Calculate some derived metrics if available
  const latency = liveStatus?.latency_p50_ms ? `${liveStatus.latency_p50_ms.toFixed(1)}ms` : "--"
  const backendHalted = liveStatus?.engine_halted ? "HALTED" : "RUNNING"
  
  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header with Admin Link */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
        <div className="flex gap-2">
            <span className="flex h-2 w-2 translate-y-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-muted-foreground pt-1">System Normal</span>
            <Button variant="outline" size="sm" className="ml-4 gap-2" onClick={() => window.open('http://localhost:8501', '_blank')}>
            <ExternalLink className="h-4 w-4" />
            Admin Cockpit
            </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total P&L"
          value=",245,302.50"
          trend="up"
          trendValue="+12.4%"
          subtext="Inception to Date"
        />
        <MetricCard
          title="Daily P&L"
          value="+2,450.00"
          trend="up"
          trendValue="+1.02%"
          subtext="Real-time"
          isLive={true}
        />
        <MetricCard
          title="Risk Metrics"
          value="2.45"
          trend="neutral"
          subtext="Sharpe Ratio (Annualized)"
          trendValue="DD: -4.2%"
        />
        <MetricCard
          title="Live Model"
          value="PROD-ALPHA-V4"
          trend="neutral"
          subtext="Regime: Volatility Long"
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
      </div>
    </div>
  )
}