"use client"

import { ProcessMonitor } from "@/components/data/process-monitor"
import { DataStatusGrid } from "@/components/data/status-grid"
import { DataQualityAlerts } from "@/components/data/quality-alerts"
import { LogViewer } from "@/components/status/log-viewer"
import { InfoTooltip } from "@/components/ui/info-tooltip"

export default function DataHubPage() {
  return (
    <div className="flex flex-col gap-4 p-4 h-full min-h-[calc(100vh-4rem)] bg-background text-foreground font-sans overflow-auto">
      
      {/* Header / Info Area */}
      <div className="flex flex-col gap-1 px-1 shrink-0">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Data Hub <InfoTooltip content="Central command for data ingestion. Use 'SimFin Bulk' weekly and 'Daily Sync' every morning." />
          </h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Storage // DuckDB // Telemetry</p>
      </div>

      {/* Top Section: Status Matrix (Compact Strip) */}
      <div className="flex-none max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
           <DataStatusGrid />
      </div>

      {/* Bottom Section: 2-Column Split (Left: Ops Stack, Right: Logs) */}
      <div className="flex-1 min-h-[500px] grid grid-cols-1 lg:grid-cols-12 gap-4">
        
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
