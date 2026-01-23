import { ProcessMonitor } from "@/components/data/process-monitor"
import { AssetTable } from "@/components/data/asset-table"

export default function DataHubPage() {
  return (
    <div className="flex flex-col gap-6 p-4 h-full">
      <div className="grid gap-6 md:grid-cols-3 h-full">
        {/* Left Column: Process Monitor & Stats */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <ProcessMonitor />
          {/* We could add more stats cards here like "Rows Processed", "Disk Usage" etc */}
        </div>

        {/* Right Column: Data Table */}
        <div className="md:col-span-2 overflow-auto">
          <AssetTable />
        </div>
      </div>
    </div>
  )
}
