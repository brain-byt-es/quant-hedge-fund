"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface RankingData {
  symbol: string;
  momentum?: number;
  quality?: number;
  value?: number;
  growth?: number;
  safety?: number;
  f_score?: number;
  rank?: number;
  as_of: string;
  [key: string]: string | number | undefined | unknown;
}

export function RawRankingsTable({ data }: { data: RankingData[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "momentum", desc: true }])

  const columns = React.useMemo<ColumnDef<RankingData>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: ({ column }) => (
          <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
            SYMBOL
            {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
          </div>
        ),
        cell: ({ row }) => <span className="font-bold text-foreground group-hover:text-primary transition-colors">{row.original.symbol}</span>,
      },
      {
        accessorKey: "momentum",
        header: ({ column }) => (
          <div className="flex items-center justify-end gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
            MOM
            {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
          </div>
        ),
        cell: ({ row }) => <div className="text-right text-primary">{(row.original.momentum as number)?.toFixed(1) || "-"}</div>,
      },
      {
        accessorKey: "quality",
        header: ({ column }) => (
          <div className="flex items-center justify-end gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
            QUAL
            {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
          </div>
        ),
        cell: ({ row }) => <div className="text-right text-muted-foreground">{(row.original.quality as number)?.toFixed(1) || "-"}</div>,
      },
      {
        accessorKey: "value",
        header: ({ column }) => (
          <div className="flex items-center justify-end gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
            VAL
            {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
          </div>
        ),
        cell: ({ row }) => <div className="text-right text-muted-foreground">{(row.original.value as number)?.toFixed(1) || "-"}</div>,
      },
      {
        accessorKey: "growth",
        header: ({ column }) => (
          <div className="flex items-center justify-end gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
            GROW
            {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
          </div>
        ),
        cell: ({ row }) => <div className="text-right text-muted-foreground">{(row.original.growth as number)?.toFixed(1) || "-"}</div>,
      },
      {
        accessorKey: "safety",
        header: ({ column }) => (
          <div className="flex items-center justify-end gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
            SAFE
            {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
          </div>
        ),
        cell: ({ row }) => <div className="text-right text-muted-foreground">{(row.original.safety as number)?.toFixed(1) || "-"}</div>,
      },
      {
        accessorKey: "f_score",
        header: ({ column }) => (
          <div className="flex items-center justify-end gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
            F-SCORE
            {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
          </div>
        ),
        cell: ({ row }) => {
          const score = row.original.f_score as number;
          return (
            <div className={cn(
              "text-right font-black",
              score >= 7 ? "text-green-500" : score <= 3 ? "text-red-500" : "text-muted-foreground"
            )}>
              {score ?? "-"}
            </div>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const { rows } = table.getRowModel()

  const parentRef = React.useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Fixed height per row in pixels
    overscan: 10,
  })

  return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex flex-col overflow-hidden shadow-xl">
      <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between bg-card/20 shrink-0">
        <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Factor Rankings (Universe)</CardTitle>
        <span className="text-[9px] text-muted-foreground font-mono">Count: {data.length}</span>
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
                      className="h-7 text-[9px] uppercase text-muted-foreground px-2 flex items-center bg-transparent border-none"
                      style={{ width: header.column.getSize(), flex: header.id === 'symbol' ? '1 1 auto' : '0 0 80px' }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                    data-index={virtualRow.index}
                    className="border-border/30 hover:bg-primary/5 transition-colors group absolute w-full flex"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-1.5 text-xs font-mono px-2 flex items-center border-none"
                        style={{ width: cell.column.getSize(), flex: cell.column.id === 'symbol' ? '1 1 auto' : '0 0 80px' }}
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