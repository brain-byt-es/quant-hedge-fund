"use client"

import { useState } from "react"
import { CompactGrid } from "@/components/market-hub/compact-grid"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

interface PaginatedTableProps<T> {
  data: T[]
  columns: { header: string; accessorKey: string; cell?: (item: T) => React.ReactNode; sortable?: boolean; className?: string }[]
  isLoading?: boolean
  onRowClick?: (item: T) => void
  defaultRowsPerPage?: number
  rowClassName?: (item: T) => string
}

export function PaginatedTable<T extends { symbol?: string; ticker?: string; changesPercentage?: number; change_percent?: number }>({
  data,
  columns,
  isLoading,
  onRowClick,
  defaultRowsPerPage = 20,
  rowClassName
}: PaginatedTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage)

  // Clamp current page to valid range if data/rows change
  const isAll = rowsPerPage === 9999
  const totalPages = isAll ? 1 : Math.ceil(data.length / rowsPerPage) || 1
  const effectivePage = Math.min(currentPage, totalPages)

  const paginatedData = isAll 
    ? data 
    : data.slice(
        (effectivePage - 1) * rowsPerPage,
        effectivePage * rowsPerPage
      )

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleRowsChange = (value: string) => {
      const num = Number(value)
      setRowsPerPage(num)
      setCurrentPage(1)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border border-border/40 rounded-lg overflow-hidden bg-card/20 shadow-sm min-h-[500px]">
        <CompactGrid 
            data={paginatedData} 
            columns={columns} 
            isLoading={isLoading} 
            onRowClick={onRowClick}
            rowClassName={rowClassName}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-1">
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold mr-2">Rows:</span>
            <Select value={String(rowsPerPage)} onValueChange={handleRowsChange}>
                <SelectTrigger className="h-8 w-[80px] text-xs bg-muted/20 border-border/50">
                    <SelectValue placeholder={String(rowsPerPage)} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="9999">All</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="flex items-center gap-4">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                Page {effectivePage} of {totalPages} • {data.length} Total
            </span>
            
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(Math.max(1, effectivePage - 1))}
                    disabled={effectivePage === 1}
                >
                    <IconChevronLeft className="size-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(Math.min(totalPages, effectivePage + 1))}
                    disabled={effectivePage === totalPages || totalPages === 0}
                >
                    <IconChevronRight className="size-4" />
                </Button>
            </div>
        </div>
      </div>
    </div>
  )
}
