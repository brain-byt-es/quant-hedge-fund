"use client"

import { BacktestList } from "@/components/research/backtest-list"
import { StrategyEditor } from "@/components/research/strategy-editor"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function ResearchPage() {
  return (
    <div className="flex flex-col gap-6 p-6 h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Section: Strategy Configuration */}
      <div className="flex-none grid grid-cols-12 gap-6 h-[55%]">
        {/* Editor Area */}
        <div className="col-span-12 lg:col-span-8 h-full min-h-0">
             <StrategyEditor />
        </div>
        
        {/* Helper Panel (Validation / Heatmap placeholder) */}
        <div className="col-span-12 lg:col-span-4 h-full min-h-0 flex flex-col gap-6">
             <Card className="flex-1 bg-muted/10 border-dashed min-h-0">
                <CardHeader>
                    <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">Validation Tracker</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full">
                    <div className="text-sm text-muted-foreground italic">No nightly validation runs</div>
                </CardContent>
             </Card>
             <Card className="flex-1 bg-muted/10 border-dashed min-h-0">
                <CardHeader>
                    <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">Factor Heatmap</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full">
                    <div className="text-sm text-muted-foreground italic">Factor data unavailable</div>
                </CardContent>
             </Card>
        </div>
      </div>

      {/* Bottom Section: Backtest History */}
      <div className="flex-1 min-h-0">
        <BacktestList />
      </div>
    </div>
  )
}
