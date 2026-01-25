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
import { LineChart, Line, ResponsiveContainer } from "recharts"

const mockWeights = [
  { rank: 1, symbol: "NVDA", signal: 0.85, weight: "12.4%", return12m: "+142%", vol: "32%", trend: [10, 15, 8, 20, 25, 30, 28] },
  { rank: 2, symbol: "MSFT", signal: 0.62, weight: "8.2%", return12m: "+24%", vol: "18%", trend: [20, 22, 21, 23, 22, 24, 25] },
  { rank: 3, symbol: "AAPL", signal: 0.45, weight: "7.5%", return12m: "+12%", vol: "15%", trend: [30, 28, 29, 27, 26, 28, 29] },
  { rank: 4, symbol: "META", signal: 0.78, weight: "6.1%", return12m: "+88%", vol: "28%", trend: [5, 10, 15, 12, 20, 25, 24] },
  { rank: 5, symbol: "TSLA", signal: -0.12, weight: "4.8%", return12m: "-15%", vol: "45%", trend: [40, 35, 30, 32, 28, 25, 22] },
]

export function ActiveWeightsTable() {
  return (
    <Card className="border-zinc-800 bg-zinc-950/50">
      <CardHeader className="py-3 border-b border-zinc-800">
        <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Active Weights & Alpha Factors</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="w-12 text-[10px] uppercase">Rank</TableHead>
              <TableHead className="text-[10px] uppercase">Symbol</TableHead>
              <TableHead className="text-right text-[10px] uppercase">Signal</TableHead>
              <TableHead className="text-right text-[10px] uppercase">Weight</TableHead>
              <TableHead className="text-right text-[10px] uppercase">12M Ret</TableHead>
              <TableHead className="text-right text-[10px] uppercase">Ann. Vol</TableHead>
              <TableHead className="text-right text-[10px] uppercase w-24">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockWeights.map((w) => (
              <TableRow key={w.symbol} className="border-zinc-900 hover:bg-zinc-900/50 h-10">
                <TableCell className="font-mono text-zinc-500 text-[10px]">{w.rank}</TableCell>
                <TableCell className="font-bold font-mono text-primary text-xs">{w.symbol}</TableCell>
                <TableCell className="text-right font-mono text-xs">{w.signal.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-emerald-500">{w.weight}</TableCell>
                <TableCell className="text-right font-mono text-xs">{w.return12m}</TableCell>
                <TableCell className="text-right font-mono text-xs text-zinc-500">{w.vol}</TableCell>
                <TableCell className="text-right p-1">
                    <div className="h-6 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={w.trend.map(v => ({v}))}>
                                <Line type="monotone" dataKey="v" stroke="#0ea5e9" strokeWidth={1.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
