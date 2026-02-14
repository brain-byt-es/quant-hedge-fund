"use client"

import { ProcessMonitor } from "@/components/data/process-monitor"
import { DataStatusGrid } from "@/components/data/status-grid"
import { DataQualityAlerts } from "@/components/data/quality-alerts"
import { SqlExplorer } from "@/components/data/sql-explorer"
import { LogViewer } from "@/components/status/log-viewer"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Activity } from "lucide-react"

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
      <div className="flex-none">
           <DataStatusGrid />
      </div>

      <Tabs defaultValue="monitor" className="flex-1 flex flex-col min-h-0 gap-4">
        <div className="flex items-center justify-between shrink-0">
            <TabsList className="bg-muted/50 border border-border/50 p-1">
                <TabsTrigger value="monitor" className="text-[10px] uppercase font-bold gap-2 px-4">
                    <Activity className="h-3 w-3" /> Pipeline Monitor
                </TabsTrigger>
                <TabsTrigger value="explorer" className="text-[10px] uppercase font-bold gap-2 px-4">
                    <Database className="h-3 w-3" /> SQL Explorer
                </TabsTrigger>
            </TabsList>
        </div>

        {/* Tab 1: Monitor (Current Layout) */}
        <TabsContent value="monitor" className="flex-1 min-h-0 m-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                {/* Left Stack: Monitor + Alerts (5 Cols) */}
                <div className="lg:col-span-5 h-full flex flex-col gap-4">
                    <div className="flex-1 min-h-[300px]">
                        <ProcessMonitor />
                    </div>
                    <div className="flex-1 min-h-[200px]">
                        <DataQualityAlerts />
                    </div>
                </div>

                {/* Right: Live Terminal (7 Cols) */}
                <div className="lg:col-span-7 h-full min-h-[500px]">
                    <LogViewer />
                </div>
            </div>
        </TabsContent>

        {/* Tab 2: SQL Explorer (New) */}
        <TabsContent value="explorer" className="flex-1 min-h-0 m-0 focus-visible:outline-none">
            <SqlExplorer />
        </TabsContent>
      </Tabs>
    </div>
  )
}
