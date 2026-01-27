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

    { label: "Total Return", value: "+24.5%", subValue: "0.45x Bench", trend: "up", color: "text-primary" },

    { label: "Benchmark", value: "+12.3%", subValue: "SPY", trend: "up", color: "text-muted-foreground" },

    { label: "CAGR", value: "18.2%", trend: "up", color: "text-chart-3" },

    { label: "Max Drawdown", value: "-8.4%", trend: "down", color: "text-destructive" },

    { label: "Daily Sharpe", value: "1.45", trend: "neutral", color: "text-chart-4" },

  ]



  return (

    <div className="w-full bg-background/90 backdrop-blur-md border-b border-border p-2 flex items-center justify-between sticky top-0 z-50 shadow-lg">

        <div className="flex items-center gap-6 px-4 w-full">

            {/* Status Indicator */}

            <div className="flex flex-col items-center justify-center border-r border-border pr-6">

                <div className="h-3 w-3 rounded-full bg-primary animate-pulse shadow-[0_0_10px_var(--primary)]" />

                <span className="text-[9px] uppercase tracking-widest text-primary font-bold mt-1">Live</span>

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

            <div className="border-l border-border pl-6 flex flex-col items-end">

                 <Badge variant="outline" className="border-border bg-muted text-muted-foreground font-mono text-[10px]">

                    <Activity className="h-3 w-3 mr-1 text-primary" />

                    System Healthy

                 </Badge>

            </div>

        </div>

    </div>

  )

}
