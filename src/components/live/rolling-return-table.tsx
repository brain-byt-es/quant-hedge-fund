"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const periods = [
  { name: "MTD", strategy: "+2.4%", benchmark: "+1.2%", alpha: "+1.2%" },
  { name: "3M", strategy: "+8.1%", benchmark: "+4.5%", alpha: "+3.6%" },
  { name: "6M", strategy: "+15.2%", benchmark: "+9.8%", alpha: "+5.4%" },
  { name: "YTD", strategy: "+2.4%", benchmark: "+1.2%", alpha: "+1.2%" },
  { name: "1Y", strategy: "+28.4%", benchmark: "+18.2%", alpha: "+10.2%" },
]

export function RollingReturnTable() {
  return (
    <Card className="border-zinc-800 bg-zinc-950/50">
      <CardHeader className="py-3 border-b border-zinc-800">
        <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Rolling Return Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase">Period</TableHead>
              <TableHead className="text-right text-[10px] uppercase">Strat</TableHead>
              <TableHead className="text-right text-[10px] uppercase">Bench</TableHead>
              <TableHead className="text-right text-[10px] uppercase">Alpha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p) => (
              <TableRow key={p.name} className="border-zinc-900 hover:bg-zinc-900/50 h-10">
                <TableCell className="font-bold text-xs">{p.name}</TableCell>
                <TableCell className="text-right font-mono text-xs text-emerald-500">{p.strategy}</TableCell>
                <TableCell className="text-right font-mono text-xs text-zinc-500">{p.benchmark}</TableCell>
                <TableCell className="text-right font-mono text-xs text-primary font-bold">{p.alpha}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
