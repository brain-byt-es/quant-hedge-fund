"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { api } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"

interface HealthReport {
  price_holes: { symbol: string, max_gap: number, gap_count: number }[]
  outliers: { symbol: string, date: string, close: number, prev_close: number, daily_return: number }[]
  staleness: { symbol: string, last_date: string, days_stale: number }[]
  duplicates: { symbol: string, date: string, occurrence: number }[]
  universe_consistency: {
      missing_prices_for_universe: number
      samples: { symbol: string }[]
  }
}

export function DataQualityAlerts() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await api.getDataHealth()
        setReport(data)
      } catch {
        console.debug("Quality Alerts: Backend busy...")
      } finally {
        setLoading(false)
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 15000) // Lower frequency for heavy validation
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
      <Card className="h-full border-border bg-card/30 flex items-center justify-center p-8">
          <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest animate-pulse">Analyzing Data Integrity...</div>
      </Card>
  )

  const hasIssues = !!report && (
      (report.price_holes?.length || 0) > 0 || 
      (report.outliers?.length || 0) > 0 || 
      (report.staleness?.length || 0) > 0 ||
      (report.universe_consistency?.missing_prices_for_universe || 0) > 0
  )

  return (
    <Card className="h-full border-border bg-card/30 flex flex-col overflow-hidden">
      <CardHeader className="py-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between shrink-0">
        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-primary" />
            Data Integrity Scan
        </CardTitle>
        {hasIssues ? (
            <Badge variant="destructive" className="h-4 text-[8px] uppercase tracking-tighter">Issues Detected</Badge>
        ) : (
            <Badge variant="outline" className="h-4 text-[8px] uppercase tracking-tighter border-emerald-500/30 text-emerald-500">Verified</Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0 min-h-0">
        <ScrollArea className="h-full p-4">
            <div className="space-y-4">
                {/* 1. Price Holes */}
                {(report?.price_holes?.length || 0) > 0 && (
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-black text-destructive tracking-widest">Price Gaps (Holes)</span>
                        {report?.price_holes.slice(0, 5).map((hole, i) => (
                            <div key={i} className="flex justify-between items-center bg-destructive/5 border border-destructive/10 p-2 rounded text-[10px] font-mono">
                                <span className="font-bold text-foreground">{hole.symbol}</span>
                                <span className="text-muted-foreground">Max Gap: {hole.max_gap} days</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. Outliers */}
                {(report?.outliers?.length || 0) > 0 && (
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-black text-amber-500 tracking-widest">Price Anomalies</span>
                        {report?.outliers.slice(0, 5).map((outlier, i) => (
                            <div key={i} className="flex justify-between items-center bg-amber-500/5 border border-amber-500/10 p-2 rounded text-[10px] font-mono">
                                <span className="font-bold text-foreground">{outlier.symbol}</span>
                                <span className="text-muted-foreground">Change: {(outlier.daily_return * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. Universe Consistency */}
                {(report?.universe_consistency?.missing_prices_for_universe || 0) > 0 && (
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-black text-primary tracking-widest">Missing Prices</span>
                        <div className="bg-primary/5 border border-primary/10 p-2 rounded text-[10px] font-mono flex items-center gap-2">
                            <Info className="h-3 w-3 text-primary" />
                            <span>{report?.universe_consistency.missing_prices_for_universe} symbols in stock list have no price data.</span>
                        </div>
                    </div>
                )}

                {!hasIssues && (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center opacity-50">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <span className="text-[10px] uppercase font-mono tracking-widest">Data series healthy. No anomalies found.</span>
                    </div>
                )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
