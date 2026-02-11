"use client"

import { useEffect, useState } from "react"
import { Database, Activity } from "lucide-react"
import { api } from "@/lib/api"

interface TableStat {
  name: string
  count: number
  status: "idle" | "syncing" | "error" | "active" | "missing"
  lastUpdated?: string
}

const formatName = (name: string) => {
    // Clean SimFin/FMP table names to readable labels
    let n = name.replace("bulk_", "").replace("_fmp", "").replace("_statement", "");
    n = n.replace("_annual", " (A)").replace("_quarter", " (Q)");
    
    // Sector Handling
    if (n.includes("banks")) n = n.replace("_banks", "").replace(" (Q)", "") + " (Bank)";
    if (n.includes("insurance")) n = n.replace("_insurance", "").replace(" (Q)", "") + " (Ins)";
    
    // Core Types
    n = n.replace("historical_", "").replace("stock_", "");
    
    // Capitalize
    return n.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function DataStatusGrid() {
  const [tables, setTables] = useState<TableStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const stats = await api.getDataStats()
            if (Array.isArray(stats)) {
                setTables(stats)
                setLoading(false)
            }
        } catch {
            console.debug("Data Hub: Backend busy...")
        }
    }
    
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading && tables.length === 0) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 pb-2">
            {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-10 w-full bg-muted/20 animate-pulse rounded-md border border-border/50" />
            ))}
        </div>
      )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 pb-2">
      {tables
        .filter(table => table.count > 0) // HIDE EMPTY TABLES
        .map((table) => {
        const isActive = table.count > 0;
        const displayName = formatName(table.name);
        
        return (
        <div 
          key={table.name}
          className={`
            flex items-center justify-between gap-2 px-3 py-2 rounded-md border
            bg-card/50 backdrop-blur-md transition-all
            ${isActive ? 'border-border shadow-sm' : 'border-dashed border-border/50 opacity-60'}
          `}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {table.status === 'syncing' ? (
                <Activity className="h-3 w-3 text-primary animate-spin shrink-0" />
            ) : isActive ? (
                <Database className="h-3 w-3 text-primary/70 shrink-0" />
            ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
            )}
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-tight truncate" title={displayName}>
              {displayName}
            </span>
          </div>
          
          <span className={`text-xs font-mono font-bold shrink-0 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {table.count >= 0 ? (table.count > 1000000 ? `${(table.count/1000000).toFixed(1)}M` : table.count > 1000 ? `${(table.count/1000).toFixed(1)}k` : table.count) : '-'}
          </span>
        </div>
      )})}
    </div>
  )
}
