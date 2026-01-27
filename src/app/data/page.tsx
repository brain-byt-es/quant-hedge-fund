"use client"

import { ProcessMonitor } from "@/components/data/process-monitor"
import { DataStatusGrid } from "@/components/data/status-grid"
import { LogViewer } from "@/components/status/log-viewer"

export default function DataHubPage() {
  return (
    <div className="flex flex-col gap-2 p-2 h-[calc(100vh-4rem)] bg-black text-zinc-400 font-mono text-xs">
      
      {/* Top Row: Controls & Status Matrix */}
      <div className="grid grid-cols-12 gap-2 h-1/3">
        <div className="col-span-3 flex flex-col gap-2 h-full">
           <ProcessMonitor />
        </div>
        <div className="col-span-9 h-full overflow-y-auto">
           <DataStatusGrid />
        </div>
      </div>

      {/* Bottom Row: Live Terminal */}
      <div className="flex-1 min-h-0 border border-zinc-800 rounded-lg bg-zinc-950/80 overflow-hidden">
        <div className="px-2 py-1 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <span className="uppercase text-[10px] tracking-widest text-emerald-500">System Logs // Realtime</span>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="h-full">
            <LogViewer />
        </div>
      </div>
    </div>
  )
}
