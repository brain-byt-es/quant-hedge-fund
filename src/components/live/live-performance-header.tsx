"use client"

import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"

interface PerformanceMetric {
  label: string
  value: string
  subValue?: string
  trend?: "up" | "down" | "neutral"
  color?: string
}

export function LivePerformanceHeader() {
  // Mock Data - Connect to real store later
  const metrics: PerformanceMetric[] = [
    { label: "Total Return", value: "+24.5%", subValue: "0.45x Bench", trend: "up", color: "text-emerald-500" },
    { label: "Benchmark", value: "+12.3%", subValue: "SPY", trend: "up", color: "text-zinc-400" },
    { label: "CAGR", value: "18.2%", trend: "up", color: "text-blue-400" },
    { label: "Max Drawdown", value: "-8.4%", trend: "down", color: "text-rose-500" },
    { label: "Daily Sharpe", value: "1.45", trend: "neutral", color: "text-amber-400" },
  ]

  return (
    <div className="w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 p-2 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-6 px-4 w-full">
            {/* Status Indicator */}
            <div className="flex flex-col items-center justify-center border-r border-zinc-800 pr-6">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold mt-1">Live</span>
            </div>

            {/* Metrics Grid */}
            <div className="flex-1 grid grid-cols-5 gap-4">
                {metrics.map((m) => (
                    <div key={m.label} className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{m.label}</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-xl font-mono font-bold ${m.color || 'text-zinc-200'}`}>
                                {m.value}
                            </span>
                            {m.subValue && (
                                <span className="text-[10px] text-zinc-600 font-mono bg-zinc-900 px-1 rounded">
                                    {m.subValue}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Action / Status */}
            <div className="border-l border-zinc-800 pl-6 flex flex-col items-end">
                 <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-400 font-mono text-[10px]">
                    <Activity className="h-3 w-3 mr-1 text-emerald-500" />
                    System Healthy
                 </Badge>
            </div>
        </div>
    </div>
  )
}