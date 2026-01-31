"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface MarketData {
  symbol: string;
  price?: number;
  change_percent?: number;
  market_cap?: number;
  volume?: number;
  f_score?: number;
  momentum?: number;
  as_of: string;
  [key: string]: any;
}

type SortKey = keyof MarketData;

export function MarketOverviewTable({ data, onSelectSymbol }: { data: MarketData[], onSelectSymbol: (s: string) => void }) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ 
      key: 'market_cap', 
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

  const renderHeader = (label: string, key: SortKey, align: string = "right", width?: string) => (
      <TableHead 
          className={`h-8 text-[10px] uppercase text-muted-foreground ${align === 'right' ? 'text-right' : ''} cursor-pointer hover:text-foreground transition-colors select-none px-3`}
          onClick={() => handleSort(key)}
          style={{ width }}
      >
          <div className={`flex items-center ${align === 'right' ? 'justify-end' : ''} gap-1`}>
              {label}
              <SortIcon column={key} />
          </div>
      </TableHead>
  );

  const formatCurrency = (val?: number) => {
      if (val === undefined || val === null) return "-";
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatLargeNumber = (num?: number) => {
      if (!num) return "-";
      if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      return `$${num.toLocaleString()}`;
  };
  
  const formatVolume = (num?: number) => {
      if (!num) return "-";
      if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
      return num.toLocaleString();
  };

  return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex flex-col overflow-hidden shadow-xl">
        <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between bg-card/20">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Market Overview (Live)</CardTitle>
            <div className="flex gap-2">
                <Badge variant="outline" className="text-[9px] h-4 bg-background/50 text-muted-foreground">{data.length} Assets</Badge>
            </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm border-b border-border/50">
                    <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground px-3 w-[50px] text-center">#</TableHead>
                        {renderHeader("Name", "symbol", "left", "100px")}
                        {renderHeader("Price", "price")}
                        {renderHeader("24h %", "change_percent")}
                        {renderHeader("Market Cap", "market_cap")}
                        {renderHeader("Volume (24h)", "volume")}
                        {renderHeader("F-Score", "f_score")}
                        {renderHeader("Momentum", "momentum")}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.map((row, i) => (
                        <TableRow 
                            key={row.symbol} 
                            className="border-border/30 hover:bg-primary/5 transition-colors group cursor-pointer"
                            onClick={() => onSelectSymbol(row.symbol)}
                        >
                            <TableCell className="py-2 text-[10px] font-mono text-muted-foreground text-center px-3">{i + 1}</TableCell>
                            <TableCell className="py-2 text-xs font-mono font-bold text-foreground px-3 group-hover:text-primary">
                                {row.symbol}
                            </TableCell>
                            <TableCell className="py-2 text-xs font-mono text-right px-3">{formatCurrency(row.price)}</TableCell>
                            <TableCell className={`py-2 text-xs font-mono text-right px-3 ${row.change_percent && row.change_percent > 0 ? 'text-green-500' : row.change_percent && row.change_percent < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {row.change_percent ? `${row.change_percent > 0 ? '+' : ''}${row.change_percent.toFixed(2)}%` : "-"}
                            </TableCell>
                            <TableCell className="py-2 text-xs font-mono text-muted-foreground text-right px-3">{formatLargeNumber(row.market_cap)}</TableCell>
                            <TableCell className="py-2 text-xs font-mono text-muted-foreground text-right px-3">{formatVolume(row.volume)}</TableCell>
                            <TableCell className="py-2 text-xs font-mono text-right px-3">
                                <span className={`font-bold ${row.f_score && row.f_score >= 7 ? 'text-green-500' : row.f_score && row.f_score <= 3 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                    {row.f_score ?? "-"}
                                </span>
                                <span className="text-[9px] text-muted-foreground/50 ml-0.5">/9</span>
                            </TableCell>
                            <TableCell className="py-2 text-xs font-mono text-right px-3 text-primary">{row.momentum?.toFixed(0)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  )
}
