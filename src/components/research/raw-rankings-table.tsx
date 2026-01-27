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
    <Card className="h-full border-zinc-800 bg-zinc-950 flex flex-col">
        <CardHeader className="py-2 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Raw Rankings</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="h-8 text-[9px] uppercase text-zinc-600">Symbol</TableHead>
                        <TableHead className="h-8 text-[9px] uppercase text-zinc-600 text-right">Score</TableHead>
                        <TableHead className="h-8 text-[9px] uppercase text-zinc-600 text-right">Rank</TableHead>
                        <TableHead className="h-8 text-[9px] uppercase text-zinc-600 text-right">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.map((row) => (
                        <TableRow key={row.symbol} className="border-zinc-800/50 hover:bg-zinc-900/50">
                            <TableCell className="py-1 text-xs font-mono font-bold text-zinc-200">{row.symbol}</TableCell>
                            <TableCell className="py-1 text-xs font-mono text-emerald-500 text-right">{row.factor_signal.toFixed(4)}</TableCell>
                            <TableCell className="py-1 text-xs font-mono text-zinc-500 text-right">#{row.rank}</TableCell>
                            <TableCell className="py-1 text-xs font-mono text-zinc-600 text-right">{row.as_of}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  )
}
