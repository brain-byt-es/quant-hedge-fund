"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Play, RotateCcw } from "lucide-react"
import { api, BacktestRun } from "@/lib/api"

export function BacktestList() {
  const [runs, setRuns] = useState<BacktestRun[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRuns = async () => {
    try {
      const data = await api.listBacktests()
      setRuns(data)
    } catch (e) {
      console.error("Failed to fetch backtests", e)
    }
  }

  const handleRunMock = async () => {
      setLoading(true)
      try {
          await api.triggerMockBacktest()
          // Wait a bit for MLflow to register it
          setTimeout(fetchRuns, 1000)
      } finally {
          setLoading(false)
      }
  }

  useEffect(() => {
    fetchRuns()
  }, [])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none flex flex-row items-center justify-between pb-2">
        <div>
            <CardTitle>Backtest History (MLflow)</CardTitle>
            <CardDescription>Performance metrics from Zipline strategy runs.</CardDescription>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchRuns}><RotateCcw className="mr-2 h-4 w-4"/> Refresh</Button>
            <Button size="sm" onClick={handleRunMock} disabled={loading}>
                <Play className="mr-2 h-4 w-4" /> 
                {loading ? "Running..." : "New Backtest"}
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto min-h-0">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead className="text-right">Sharpe</TableHead>
              <TableHead className="text-right">Return (Ann.)</TableHead>
              <TableHead className="text-right">Max DD</TableHead>
              <TableHead className="text-right">Alpha</TableHead>
              <TableHead className="text-right">Beta</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                        No backtests recorded yet. Start one to populate this lab.
                    </TableCell>
                </TableRow>
            ) : (
                runs.map((run) => (
                  <TableRow key={run.run_id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(run.start_time).toLocaleDateString()} <br/>
                        {new Date(run.start_time).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="font-medium">{run.strategy_name}</TableCell>
                    <TableCell className={`text-right font-mono ${run.sharpe_ratio > 1.5 ? "text-emerald-500 font-bold" : ""}`}>
                        {run.sharpe_ratio?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{(run.annual_return * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-rose-500">{(run.max_drawdown * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono">{run.alpha?.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono">{run.beta?.toFixed(2)}</TableCell>
                    <TableCell>
                        <Badge variant={run.status === "FINISHED" ? "default" : "secondary"}>
                            {run.status}
                        </Badge>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
