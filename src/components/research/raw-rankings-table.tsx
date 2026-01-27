"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface RankingData {
  symbol: string;
  factor_signal: number;
  rank: number;
  as_of: string;
  [key: string]: unknown;
}

export function RawRankingsTable({ data }: { data: RankingData[] }) {
  // Sort by score descending
  const sorted = [...data].sort((a, b) => b.factor_signal - a.factor_signal)

  return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex flex-col overflow-hidden shadow-xl">
        <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between bg-card/20">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Raw Factor Rankings</CardTitle>
            <span className="text-[9px] text-muted-foreground font-mono">Count: {data.length}</span>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
            <Table>
                <TableHeader className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 shadow-sm">
                    <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="h-7 text-[9px] uppercase text-muted-foreground px-3">Symbol</TableHead>
                        <TableHead className="h-7 text-[9px] uppercase text-muted-foreground text-right px-3">Score</TableHead>
                        <TableHead className="h-7 text-[9px] uppercase text-muted-foreground text-right px-3">Rank</TableHead>
                        <TableHead className="h-7 text-[9px] uppercase text-muted-foreground text-right px-3 italic">As Of</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.map((row) => (
                        <TableRow key={row.symbol} className="border-border/30 hover:bg-primary/5 transition-colors group">
                            <TableCell className="py-1.5 text-xs font-mono font-bold text-foreground px-3 group-hover:text-primary">{row.symbol}</TableCell>
                            <TableCell className="py-1.5 text-xs font-mono text-primary text-right px-3">{row.factor_signal.toFixed(4)}</TableCell>
                            <TableCell className="py-1.5 text-xs font-mono text-muted-foreground text-right px-3 group-hover:text-foreground">#{row.rank}</TableCell>
                            <TableCell className="py-1.5 text-[10px] font-mono text-muted-foreground text-right px-3">{row.as_of}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  )
}
