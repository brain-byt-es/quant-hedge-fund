"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table } from "lucide-react"
import { api } from "@/lib/api"

interface TableStat {
  name: string
  count: number
  status: "idle" | "syncing" | "error" | "active" | "missing"
  lastUpdated?: string
}

export function DataStatusGrid() {
  const [tables, setTables] = useState<TableStat[]>([])

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const stats = await api.getDataStats()
            if (Array.isArray(stats)) {
                setTables(stats)
            }
        } catch {
            // Backend is likely busy with ingestion, ignore fetch errors
            console.debug("Data Hub: Backend busy, retrying stats fetch later...")
        }
    }
    
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
      {tables.map((table) => (
        <Card 
          key={table.name}
          className={`
            p-2 border flex flex-col justify-between min-h-[60px]
            bg-card/50 backdrop-blur-md transition-all
            ${table.status === 'active' && table.count > 0 ? 'border-border shadow-sm' : 'border-muted opacity-60'}
          `}
        >
          <div className="flex justify-between items-start gap-1">
            <div className="flex items-center gap-1.5 truncate">
              <Table className="h-3 w-3 text-primary/50 shrink-0" />
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-tighter truncate" title={table.name}>
                {table.name.replace('bulk_', '').replace('_fmp', '').replace('_statement_annual', '')}
              </span>
            </div>
            {table.status === 'syncing' && (
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
            )}
          </div>
          
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-mono font-bold text-foreground">
              {table.count >= 0 ? table.count.toLocaleString() : '---'}
            </span>
            <span className="text-[8px] text-muted-foreground/50 font-mono">
              {table.lastUpdated || ''}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
