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
                // Map API response to UI model if needed, but names match mostly
                setTables(stats)
            }
        } catch (e) {
            console.error(e)
        }
    }
    
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {tables.map((table) => (
        <Card 
          key={table.name}
          className={`
            p-3 border flex flex-col justify-between h-24
            bg-zinc-950/50 backdrop-blur-md
            ${table.status === 'active' && table.count > 0 ? 'border-zinc-800' : 'border-zinc-900'}
          `}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Table className="h-3 w-3 text-zinc-500" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider truncate max-w-[100px]" title={table.name}>
                {table.name.replace('bulk_', '').replace('_fmp', '')}
              </span>
            </div>
            {table.status === 'syncing' && (
              <Badge variant="outline" className="h-4 text-[9px] border-emerald-500/50 text-emerald-400 animate-pulse px-1">
                SYNC
              </Badge>
            )}
          </div>
          
          <div className="flex items-end justify-between mt-2">
            <span className="text-xl font-mono font-bold text-zinc-100">
              {table.count.toLocaleString()}
            </span>
            <span className="text-[9px] text-zinc-600 font-mono">
              {table.lastUpdated}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
