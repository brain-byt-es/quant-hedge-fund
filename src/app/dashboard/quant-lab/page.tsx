"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    Code2, 
    Activity, 
    ShieldCheck, 
    Database, 
    FlaskConical, 
    ExternalLink,
    Terminal as TerminalIcon,
    Save
} from "lucide-react"
import { CodeEditor } from "@/components/research/code-editor"
import { StrategyForm } from "@/components/research/strategy-form"
import { StrategyGovernance } from "@/components/research/strategy-governance"
import { BacktestHistoryTable } from "@/components/research/backtest-history-table"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface BacktestRun {
  run_id: string
  strategy_name: string
  start_time: string
  status: string
  sharpe_ratio: number
  annual_return: number
  max_drawdown: number
  volatility: number
  tags: Record<string, string>
}

export default function QuantLabPage() {
  const [backtests, setBacktests] = useState<BacktestRun[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const res = await api.listBacktests(20)
        if (isMounted) {
          setBacktests((res as unknown as BacktestRun[]) || [])
        }
      } catch (err) {
        console.error(err)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  const handleRefresh = async () => {
    try {
      const res = await api.listBacktests(20)
      setBacktests((res as unknown as BacktestRun[]) || [])
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-foreground overflow-hidden p-4 md:p-6 gap-4">
      {/* Header - Engineering Focus */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-2 italic">
            <FlaskConical className="h-6 w-6 text-primary" /> Quant Strategy Lab
          </h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.2em] mt-1 font-bold">
            Institutional Algorithm Workbench // MLflow Integration
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border/50 shadow-inner">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold font-mono uppercase">MLflow Online: 5000</span>
            </div>
            <Button variant="outline" size="sm" className="h-9 text-[10px] font-black uppercase tracking-widest gap-2 bg-card" onClick={() => window.open('http://localhost:5000', '_blank')}>
                <ExternalLink className="h-3.5 w-3.5" /> MLflow UI
            </Button>
        </div>
      </div>

      {/* Main Lab Area */}
      <Tabs defaultValue="workbench" className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 shrink-0">
            <TabsList className="h-9 bg-muted/50 border border-border/50 p-1 backdrop-blur-sm">
                <TabsTrigger value="workbench" className="text-[10px] h-7 uppercase tracking-widest font-black data-[state=active]:bg-background data-[state=active]:text-primary gap-2">
                    <TerminalIcon className="h-3 w-3" /> Workbench
                </TabsTrigger>
                <TabsTrigger value="experiments" className="text-[10px] h-7 uppercase tracking-widest font-black data-[state=active]:bg-background data-[state=active]:text-primary gap-2">
                    <Activity className="h-3 w-3" /> Experiments
                </TabsTrigger>
                <TabsTrigger value="governance" className="text-[10px] h-7 uppercase tracking-widest font-black data-[state=active]:bg-background data-[state=active]:text-primary gap-2">
                    <ShieldCheck className="h-3 w-3" /> Governance
                </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 text-[10px] font-mono border-primary/20 bg-primary/5 text-primary">
                    DATA: historical_prices_fmp
                </Badge>
            </div>
        </div>

        {/* 1. WORKBENCH: Dual Pane Code + Config */}
        <TabsContent value="workbench" className="flex-1 min-h-0 mt-0 focus-visible:ring-0">
            <div className="grid grid-cols-12 gap-4 h-full">
                {/* Left: Code Editor (Large) */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
                    <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden shadow-2xl bg-black/20 backdrop-blur-md">
                        <CodeEditor />
                    </div>
                    <div className="h-12 bg-card border border-border/50 rounded-xl flex items-center px-4 justify-between shrink-0 shadow-sm">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-2">
                                <Code2 className="h-3 w-3" /> engine: zipline-reloaded
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-2 border-l border-border/50 pl-4">
                                <Database className="h-3 w-3" /> universe: simfin-anchored
                            </span>
                        </div>
                        <Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                            <Save className="h-3.5 w-3.5 mr-2" /> Inject Code
                        </Button>
                    </div>
                </div>

                {/* Right: Strategy Config (Sidebar) */}
                <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
                    <StrategyForm />
                    <Card className="border-border bg-card/30">
                        <CardHeader className="py-3">
                            <CardTitle className="text-xs uppercase tracking-widest font-black flex items-center gap-2">
                                <Activity className="h-3.5 w-3.5" /> Recent Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {backtests.slice(0, 3).map((run: BacktestRun, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                                    <div>
                                        <p className="text-[10px] font-black uppercase truncate max-w-[120px]">{run.strategy_name}</p>
                                        <p className="text-[9px] font-mono text-muted-foreground">{new Date(run.start_time).toLocaleDateString()}</p>
                                    </div>
                                    <Badge variant="outline" className={cn("text-[9px] font-mono", run.sharpe_ratio > 1 ? "text-green-500" : "text-amber-500")}>
                                        S: {run.sharpe_ratio?.toFixed(2)}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>

        {/* 2. EXPERIMENTS: MLflow View */}
        <TabsContent value="experiments" className="flex-1 min-h-0 mt-0 focus-visible:ring-0">
            <Card className="h-full border-border flex flex-col overflow-hidden shadow-xl bg-card/20">
                <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-black uppercase tracking-widest">Strategy Audit Log</CardTitle>
                            <CardDescription className="text-xs">Immutable MLflow experiment tracking</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={handleRefresh}>
                            Refresh Logs
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-0 overflow-auto">
                    <BacktestHistoryTable data={backtests} />
                </CardContent>
            </Card>
        </TabsContent>

        {/* 3. GOVERNANCE: Approval Flow */}
        <TabsContent value="governance" className="flex-1 min-h-0 mt-0 focus-visible:ring-0">
            <div className="h-full overflow-auto pr-1 custom-scrollbar">
                <StrategyGovernance />
            </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
