"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi } from "lucide-react"
import { api } from "@/lib/api"

interface PerformanceMetric {
  label: string
  value: string
  subValue?: string
  trend?: "up" | "down" | "neutral"
  color?: string
}

interface LiveStatus {
  net_liquidation?: number
  daily_pnl_usd?: number
  portfolio_var_95_usd?: number
  portfolio_var_95_percent?: number
  active_symbols?: string[]
  latency_p99_ms?: number
  ib_connected?: boolean
  engine_halted?: boolean
  last_heartbeat?: string
}

export function LivePerformanceHeader() {
  const [status, setStatus] = useState<LiveStatus | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
        try {
            const data = await api.getLiveStatus()
            setStatus(data as LiveStatus)
        } catch (e) {
            console.error("Live status fetch failed", e)
        }
    }
    
    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  // Default / Loading State
  const metrics: PerformanceMetric[] = status ? [
    { 
        label: "Net Liquidation", 
        value: `$${(status.net_liquidation || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        color: "text-primary" 
    },
    { 
        label: "Daily P&L", 
        value: `$${(status.daily_pnl_usd || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
        subValue: (status.daily_pnl_usd || 0) >= 0 ? "+OK" : "LOSS",
        color: (status.daily_pnl_usd || 0) >= 0 ? "text-primary" : "text-destructive" 
    },
    { 
        label: "Risk (VaR 95%)", 
        value: `$${(status.portfolio_var_95_usd || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}`,
        subValue: `${((status.portfolio_var_95_percent || 0) * 100).toFixed(2)}%`,
        color: "text-chart-4" 
    },
    { 
        label: "Active Positions", 
        value: (status.active_symbols || []).length.toString(),
        color: "text-foreground" 
    },
    { 
        label: "Latency (p99)", 
        value: `${status.latency_p99_ms || 0}ms`, 
        color: (status.latency_p99_ms || 0) < 100 ? "text-primary" : "text-destructive" 
    },
  ] : [
    { label: "Net Liquidation", value: "---", color: "text-muted" },
    { label: "Daily P&L", value: "---", color: "text-muted" },
    { label: "Risk (VaR 95%)", value: "---", color: "text-muted" },
    { label: "Active Positions", value: "---", color: "text-muted" },
    { label: "Latency", value: "---", color: "text-muted" },
  ]

  const isConnected = status?.ib_connected || false
  const isHalted = status?.engine_halted || false

  return (
    <div className="w-full bg-background/90 backdrop-blur-md border-b border-border p-2 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-6 px-4 w-full">
            {/* Status Indicator */}
            <div className="flex flex-col items-center justify-center border-r border-border pr-6">
                <div className={`h-3 w-3 rounded-full ${isHalted ? 'bg-destructive' : 'bg-primary'} ${isConnected && !isHalted ? 'animate-pulse' : ''} shadow-[0_0_10px_var(--primary)]`} />
                <span className={`text-[9px] uppercase tracking-widest font-bold mt-1 ${isHalted ? 'text-destructive' : 'text-primary'}`}>
                    {isHalted ? 'HALTED' : 'LIVE'}
                </span>
            </div>

            {/* Metrics Grid */}
            <div className="flex-1 grid grid-cols-5 gap-4">
                {metrics.map((m) => (
                    <div key={m.label} className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{m.label}</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-xl font-mono font-bold ${m.color || 'text-foreground'}`}>
                                {m.value}
                            </span>
                            {m.subValue && (
                                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded">
                                    {m.subValue}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Action / Status */}
            <div className="border-l border-border pl-6 flex flex-col items-end gap-1">
                 <Badge variant="outline" className={`border-border ${isConnected ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'} font-mono text-[10px]`}>
                    <Wifi className="h-3 w-3 mr-1" />
                    {isConnected ? 'Broker Connected' : 'Broker Disconnected'}
                 </Badge>
                 <span className="text-[9px] text-muted-foreground font-mono">
                    {status?.last_heartbeat ? new Date(status.last_heartbeat).toLocaleTimeString() : '--:--:--'}
                 </span>
            </div>
        </div>
    </div>
  )
}
