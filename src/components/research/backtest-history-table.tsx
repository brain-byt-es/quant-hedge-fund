"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface BacktestRun {
  run_id: string
  strategy_name: string
  start_time: string
  status: string
  sharpe_ratio: number
  annual_return: number
  max_drawdown: number
  volatility: number
}

export function BacktestHistoryTable({ data }: { data: BacktestRun[] }) {
  
  const columns = React.useMemo<ColumnDef<BacktestRun>[]>(
    () => [
      {
        accessorKey: "start_time",
        header: "TIMESTAMP",
        cell: ({ row }) => (
          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap px-3">
            {row.original.start_time ? format(new Date(row.original.start_time), "yyyy-MM-dd HH:mm") : "-"}
          </span>
        ),
      },
      {
        accessorKey: "strategy_name",
        header: "STRATEGY",
        cell: ({ row }) => (
          <span className="text-xs font-mono font-bold text-foreground px-3">
            {row.original.strategy_name}
          </span>
        ),
      },
      {
        accessorKey: "sharpe_ratio",
        header: () => <div className="text-right px-3">SHARPE</div>,
        cell: ({ row }) => {
          const val = row.original.sharpe_ratio;
          return (
            <div className={`text-right text-xs font-mono px-3 ${val > 1 ? 'text-green-500' : val < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {val?.toFixed(2) || "-"}
            </div>
          )
        },
      },
      {
        accessorKey: "annual_return",
        header: () => <div className="text-right px-3">CAGR</div>,
        cell: ({ row }) => {
          const val = row.original.annual_return;
          return (
            <div className={`text-right text-xs font-mono px-3 ${val > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {val !== undefined ? `${(val * 100).toFixed(2)}%` : "-"}
            </div>
          )
        },
      },
      {
        accessorKey: "max_drawdown",
        header: () => <div className="text-right px-3">DRAWDOWN</div>,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono text-red-400 px-3">
            {row.original.max_drawdown !== undefined ? `${(row.original.max_drawdown * 100).toFixed(2)}%` : "-"}
          </div>
        ),
      },
      {
        accessorKey: "volatility",
        header: () => <div className="text-right px-3">VOL</div>,
        cell: ({ row }) => (
          <div className="text-right text-xs font-mono text-muted-foreground px-3">
            {row.original.volatility !== undefined ? `${(row.original.volatility * 100).toFixed(2)}%` : "-"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => <div className="text-center px-3">STATUS</div>,
        cell: ({ row }) => (
          <div className="text-center px-3">
            <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${row.original.status === 'FINISHED' ? 'border-green-500/30 text-green-500 bg-green-500/5' : 'border-yellow-500/30 text-yellow-500'}`}>
              {row.original.status === 'FINISHED' ? 'DONE' : row.original.status}
            </Badge>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const { rows } = table.getRowModel()
  const parentRef = React.useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 5,
  })

  return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex flex-col overflow-hidden shadow-xl">
      <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between bg-card/20 shrink-0">
        <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Strategy Audit Log (MLflow)</CardTitle>
        <Badge variant="outline" className="text-[9px] h-4 bg-background/50 text-muted-foreground">{data.length} Runs</Badge>
      </CardHeader>
      <CardContent 
        ref={parentRef}
        className="p-0 flex-1 overflow-auto custom-scrollbar relative"
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          <Table className="border-collapse">
            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 shadow-sm border-b border-border/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border/50 hover:bg-transparent flex w-full">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="h-8 text-[10px] uppercase text-muted-foreground flex items-center bg-transparent border-none p-0"
                      style={{ 
                        width: header.column.getSize(), 
                        flex: header.id === 'strategy_name' ? '1 1 auto' : (header.id === 'start_time' ? '0 0 120px' : '0 0 85px')
                      }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                return (
                  <TableRow
                    key={row.id}
                    className="border-border/30 hover:bg-primary/5 transition-colors absolute w-full flex"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="flex items-center border-none p-0"
                        style={{ 
                          width: cell.column.getSize(), 
                          flex: cell.column.id === 'strategy_name' ? '1 1 auto' : (cell.column.id === 'start_time' ? '0 0 120px' : '0 0 85px')
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
