"use client"

import { ProcessMonitor } from "@/components/data/process-monitor"
import { DataStatusGrid } from "@/components/data/status-grid"
import { DataQualityAlerts } from "@/components/data/quality-alerts"
import { LogViewer } from "@/components/status/log-viewer"

export default function DataHubPage() {
  return (
    <div className="flex flex-col gap-4 p-4 h-[calc(100vh-4rem)] bg-background text-foreground font-sans overflow-hidden">
      
      {/* Header / Info Area */}
      <div className="flex flex-col gap-1 px-1 shrink-0">
          <h1 className="text-xl font-bold tracking-tight">Data Hub</h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Storage // DuckDB // Telemetry</p>
      </div>

      {/* Top Section: Status Matrix (Full Width) */}
      <div className="flex-none">
           <DataStatusGrid />
      </div>

      {/* Bottom Section: Multi-Col Split */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left: Process Monitor (3 Cols) */}
        <div className="lg:col-span-3 h-full min-h-0">
           <ProcessMonitor />
        </div>

        {/* Center: Quality Alerts (3 Cols) */}
        <div className="lg:col-span-3 h-full min-h-0">
            <DataQualityAlerts />
        </div>

        {/* Right: Live Terminal (6 Cols) */}
        <div className="lg:col-span-6 h-full min-h-0">
            <LogViewer />
        </div>
      </div>
    </div>
  )
}
