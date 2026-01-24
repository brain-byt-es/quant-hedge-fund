"use client";

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PortfolioChart } from "@/components/dashboard/portfolio-chart"
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
  const backendHaltedTrend = liveStatus?.engine_halted ? "down" : "up"

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header with Admin Link */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
        <Button variant="outline" className="gap-2" onClick={() => window.open('http://localhost:8501', '_blank')}>
          <ExternalLink className="h-4 w-4" />
          Open Admin Control Plane (Streamlit)
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Data Engine"
          value={dataStatus.toUpperCase()}
          trend={dataStatus === "connected" ? "up" : "down"}
          subtext="QS Connect"
        />
        <MetricCard
          title="Trading Engine"
          value={backendHalted}
          trend={backendHaltedTrend}
          trendValue={liveStatus?.ib_connected ? "Connected" : "Disconnected"}
          subtext="IBKR Gateway"
        />
        <MetricCard
          title="Execution Latency"
          value={latency}
          trend="neutral"
          subtext="P50 Order Latency"
        />
        <MetricCard
          title="Active Symbols"
          value={liveStatus?.active_symbols?.length?.toString() || "0"}
          trend="neutral"
          subtext="Truth Layer Tracking"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-4 lg:col-span-3">
             <PortfolioChart />
        </div>
        
        <div className="col-span-4 lg:col-span-1 grid gap-4">
            <MetricCard 
                title="Market Status" 
                value="OPEN" 
                subtext="NYSE / NASDAQ" 
                className="bg-sidebar/50"
            />
             {/* Iframe to Streamlit Micro-View? No, let's keep it clean for now. */}
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                <h3 className="font-semibold leading-none tracking-tight mb-4">Quick Actions</h3>
                <div className="flex flex-col gap-2">
                    <Button variant="secondary" size="sm" onClick={() => window.open('http://localhost:8501', '_blank')}>
                        Manage Risk Limits
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => window.open('http://localhost:8501', '_blank')}>
                        View Audit Logs
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => window.open('http://localhost:8501', '_blank')}>
                        Emergency Halt
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}