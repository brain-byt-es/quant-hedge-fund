"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function RollingReturnTable() {
  const data = [
      { period: "MTD", strat: "+2.4%", bench: "+1.1%", alpha: "+1.3%" },
      { period: "3M", strat: "+8.9%", bench: "+5.2%", alpha: "+3.7%" },
      { period: "6M", strat: "+15.2%", bench: "+9.8%", alpha: "+5.4%" },
      { period: "YTD", strat: "+24.5%", bench: "+12.3%", alpha: "+12.2%" },
      { period: "1Y", strat: "+32.1%", bench: "+18.5%", alpha: "+13.6%" },
  ]

  return (
    <Card className="h-full border-zinc-800 bg-zinc-950">
        <CardHeader className="py-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Rolling Returns</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="h-8 text-[10px] uppercase text-zinc-500">Period</TableHead>
                        <TableHead className="h-8 text-[10px] uppercase text-emerald-500 text-right">Strat</TableHead>
                        <TableHead className="h-8 text-[10px] uppercase text-zinc-500 text-right">Bench</TableHead>
                        <TableHead className="h-8 text-[10px] uppercase text-blue-500 text-right">Alpha</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => (
                        <TableRow key={row.period} className="border-zinc-800/50 hover:bg-zinc-900/50">
                            <TableCell className="py-2 text-xs font-mono text-zinc-400">{row.period}</TableCell>
                            <TableCell className="py-2 text-xs font-mono text-emerald-400 text-right">{row.strat}</TableCell>
                            <TableCell className="py-2 text-xs font-mono text-zinc-500 text-right">{row.bench}</TableCell>
                            <TableCell className="py-2 text-xs font-mono text-blue-400 text-right">{row.alpha}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  )
}