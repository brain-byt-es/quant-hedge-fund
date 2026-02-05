"use client"

import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { HoverMiniChart } from "./hover-mini-chart"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { useStock360 } from "@/components/providers/stock-360-provider"

interface Column<T> {
  header: string
  accessorKey: keyof T | string
  cell?: (item: T) => React.ReactNode
  className?: string
  sortable?: boolean
}

interface CompactGridProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  isLoading?: boolean
  rowClassName?: (item: T) => string
}

export function CompactGrid<T extends { symbol?: string; ticker?: string; changesPercentage?: number; change_percent?: number }>({
  data,
  columns,
  onRowClick,
  isLoading,
  rowClassName,
}: CompactGridProps<T>) {
  const { openStock360 } = useStock360()
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data
    return [...data].sort((a, b) => {
      const valA = (a as unknown as Record<string, unknown>)[sortConfig.key]
      const valB = (b as unknown as Record<string, unknown>)[sortConfig.key]
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }

      if ((valA as number) < (valB as number)) return sortConfig.direction === 'asc' ? -1 : 1
      if ((valA as number) > (valB as number)) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
        direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  return (
    <div className="rounded-md border border-border/50 bg-card/20 overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent h-8 border-b border-border/50">
            {columns.map((col, i) => (
              <TableHead 
                key={i} 
                className={cn(
                    "text-[10px] uppercase font-black tracking-widest px-3 h-8 whitespace-nowrap",
                    col.sortable && "cursor-pointer hover:bg-muted/50 transition-colors hover:text-primary",
                    col.className
                )}
                onClick={() => col.sortable && requestSort(col.accessorKey as string)}
              >
                <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && sortConfig?.key === col.accessorKey && (
                        <span className="text-primary font-mono text-[8px] animate-in fade-in">
                            {sortConfig.direction === 'asc' ? "↑" : "↓"}
                        </span>
                    )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="h-10 animate-pulse">
                {columns.map((_, j) => (
                  <TableCell key={j} className="px-3">
                    <div className="h-4 bg-muted rounded w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : sortedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-xs text-muted-foreground italic">
                No data available.
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((item, i) => {
              const symbol = item.symbol || item.ticker || ""
              const change = item.changesPercentage ?? item.change_percent ?? 0

              return (
                <TableRow
                  key={i}
                  className={cn(
                    "cursor-pointer group h-10 hover:bg-muted/30 border-b border-border/10 transition-colors",
                    rowClassName?.(item)
                  )}
                  onClick={() => onRowClick ? onRowClick(item) : openStock360(symbol)}
                >
                  {columns.map((col, j) => (
                    <TableCell key={j} className={cn("px-3 py-2", col.className)}>
                      {col.accessorKey === "symbol" || col.accessorKey === "ticker" ? (
                        <HoverCard openDelay={200} closeDelay={0}>
                          <HoverCardTrigger asChild>
                            <span className="font-black font-mono text-sm group-hover:text-primary transition-colors">
                              {symbol}
                            </span>
                          </HoverCardTrigger>
                          <HoverCardContent 
                            side="right" 
                            align="start" 
                            className="w-auto p-0 border-none bg-transparent shadow-none pointer-events-none"
                          >
                            <HoverMiniChart symbol={symbol} changesPercentage={change} />
                          </HoverCardContent>
                        </HoverCard>
                      ) : col.cell ? (
                        col.cell(item)
                      ) : (
                        <span className="text-xs font-medium tabular-nums whitespace-nowrap">
                          {String(item[col.accessorKey as keyof T] ?? "-")}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}