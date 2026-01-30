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

      {/* Top Section: Status Matrix (Compact Strip) */}
      <div className="flex-none">
           <DataStatusGrid />
      </div>

      {/* Bottom Section: 2-Column Split (Left: Ops Stack, Right: Logs) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        
        {/* Left Stack: Monitor + Alerts (5 Cols) */}
        <div className="lg:col-span-5 h-full flex flex-col gap-4 overflow-hidden">
           <div className="flex-1 min-h-0">
               <ProcessMonitor />
           </div>
           <div className="flex-1 min-h-0">
               <DataQualityAlerts />
           </div>
        </div>

        {/* Right: Live Terminal (7 Cols) - MAX WIDTH */}
        <div className="lg:col-span-7 h-full overflow-hidden">
            <LogViewer />
        </div>
      </div>
    </div>
  )
}
