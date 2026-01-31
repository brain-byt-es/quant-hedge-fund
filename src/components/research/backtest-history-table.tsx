"use client"

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
  
  const formatPercent = (val: number) => {
      if (val === undefined || val === null) return "-"
      return `${(val * 100).toFixed(2)}%`
  }

  const formatNumber = (val: number) => {
      if (val === undefined || val === null) return "-"
      return val.toFixed(2)
  }

  return (
    <Card className="h-full border-border/50 bg-card/40 backdrop-blur-md flex flex-col overflow-hidden shadow-xl">
        <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between bg-card/20">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Strategy Audit Log (MLflow)</CardTitle>
            <Badge variant="outline" className="text-[9px] h-4 bg-background/50 text-muted-foreground">{data.length} Runs</Badge>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm border-b border-border/50">
                    <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground px-3">Timestamp</TableHead>
                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground px-3">Strategy</TableHead>
                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground px-3 text-right">Sharpe</TableHead>
                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground px-3 text-right">CAGR</TableHead>
                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground px-3 text-right">Drawdown</TableHead>
                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground px-3 text-right">Vol</TableHead>
                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground px-3 text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((run) => (
                        <TableRow key={run.run_id} className="border-border/30 hover:bg-primary/5 transition-colors">
                            <TableCell className="py-2 text-[10px] font-mono text-muted-foreground px-3 whitespace-nowrap">
                                {run.start_time ? format(new Date(run.start_time), "yyyy-MM-dd HH:mm") : "-"}
                            </TableCell>
                            <TableCell className="py-2 text-xs font-mono font-bold text-foreground px-3">
                                {run.strategy_name}
                            </TableCell>
                            <TableCell className={`py-2 text-xs font-mono text-right px-3 ${run.sharpe_ratio > 1 ? 'text-green-500' : run.sharpe_ratio < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {formatNumber(run.sharpe_ratio)}
                            </TableCell>
                            <TableCell className={`py-2 text-xs font-mono text-right px-3 ${run.annual_return > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {formatPercent(run.annual_return)}
                            </TableCell>
                            <TableCell className="py-2 text-xs font-mono text-right px-3 text-red-400">
                                {formatPercent(run.max_drawdown)}
                            </TableCell>
                            <TableCell className="py-2 text-xs font-mono text-right px-3 text-muted-foreground">
                                {formatPercent(run.volatility)}
                            </TableCell>
                            <TableCell className="py-2 text-center px-3">
                                <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${run.status === 'FINISHED' ? 'border-green-500/30 text-green-500 bg-green-500/5' : 'border-yellow-500/30 text-yellow-500'}`}>
                                    {run.status === 'FINISHED' ? 'DONE' : run.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  )
}
