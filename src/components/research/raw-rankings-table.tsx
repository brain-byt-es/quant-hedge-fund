"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

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

type SortKey = keyof RankingData;

export function RawRankingsTable({ data }: { data: RankingData[] }) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ 
      key: 'momentum', 
      direction: 'desc' 
  });

  const handleSort = (key: SortKey) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const sorted = [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
  });

  const SortIcon = ({ column }: { column: SortKey }) => {
      if (sortConfig.key !== column) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
      return sortConfig.direction === 'asc' 
          ? <ArrowUp className="ml-1 h-3 w-3 text-primary" /> 
          : <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
  };

  const renderHeader = (label: string, key: SortKey, align: string = "right") => (
      <TableHead 
          className={`h-7 text-[9px] uppercase text-muted-foreground ${align === 'right' ? 'text-right' : ''} cursor-pointer hover:text-foreground transition-colors select-none px-2`}
          onClick={() => handleSort(key)}
      >
          <div className={`flex items-center ${align === 'right' ? 'justify-end' : ''} gap-1`}>
              {label}
              <SortIcon column={key} />
          </div>
      </TableHead>
  );

  return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex flex-col overflow-hidden shadow-xl">
        <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between bg-card/20">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Factor Rankings (Universe)</CardTitle>
            <span className="text-[9px] text-muted-foreground font-mono">Count: {data.length}</span>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm border-b border-border/50">
                    <TableRow className="border-border/50 hover:bg-transparent">
                        {renderHeader("Symbol", "symbol", "left")}
                        {renderHeader("Mom", "momentum")}
                        {renderHeader("Qual", "quality")}
                        {renderHeader("Val", "value")}
                        {renderHeader("Grow", "growth")}
                        {renderHeader("Safe", "safety")}
                        {renderHeader("F-Score", "f_score")}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.map((row) => (
                        <TableRow key={row.symbol} className="border-border/30 hover:bg-primary/5 transition-colors group">
                            <TableCell className="py-1.5 text-xs font-mono font-bold text-foreground px-2 group-hover:text-primary">{row.symbol}</TableCell>
                            <TableCell className="py-1.5 text-xs font-mono text-primary text-right px-2">{row.momentum?.toFixed(1) || "-"}</TableCell>
                            <TableCell className="py-1.5 text-xs font-mono text-muted-foreground text-right px-2">{row.quality?.toFixed(1) || "-"}</TableCell>
                            <TableCell className="py-1.5 text-xs font-mono text-muted-foreground text-right px-2">{row.value?.toFixed(1) || "-"}</TableCell>
                            <TableCell className="py-1.5 text-xs font-mono text-muted-foreground text-right px-2">{row.growth?.toFixed(1) || "-"}</TableCell>
                            <TableCell className="py-1.5 text-xs font-mono text-muted-foreground text-right px-2">{row.safety?.toFixed(1) || "-"}</TableCell>
                            <TableCell className={`py-1.5 text-xs font-mono font-black text-right px-2 ${row.f_score && row.f_score >= 7 ? 'text-green-500' : row.f_score && row.f_score <= 3 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {row.f_score !== undefined ? row.f_score : "-"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  )
}