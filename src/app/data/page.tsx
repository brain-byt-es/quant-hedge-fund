"use client"

import { ProcessMonitor } from "@/components/data/process-monitor"
import { DataStatusGrid } from "@/components/data/status-grid"
import { LogViewer } from "@/components/status/log-viewer"

export default function DataHubPage() {
  return (
    <div className="flex flex-col gap-4 p-4 h-[calc(100vh-4rem)] bg-background text-foreground font-sans overflow-hidden">
      
      {/* Header / Info Area */}
      <div className="flex flex-col gap-1 px-1">
          <h1 className="text-xl font-bold tracking-tight">Data Hub</h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Storage // DuckDB // Telemetry</p>
      </div>

      {/* Top Section: Status Matrix (Full Width) */}
      <div className="flex-none">
           <DataStatusGrid />
      </div>

      {/* Bottom Section: Controls & Terminal Split */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Left Column: Process Monitor (1/3) */}
        <div className="md:col-span-1 h-full min-h-0">
           <ProcessMonitor />
        </div>

        {/* Right Column: Live Terminal (2/3) */}
        <div className="md:col-span-2 h-full min-h-0">
            <LogViewer />
        </div>
      </div>
    </div>
  )
}
