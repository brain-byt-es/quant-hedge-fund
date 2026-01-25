"use client"

import { BacktestList } from "@/components/research/backtest-list"
import { StrategyEditor } from "@/components/research/strategy-editor"
import { StrategyGovernance } from "@/components/research/strategy-governance"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function ResearchPage() {
  return (
    <div className="flex flex-col gap-6 p-6 h-[calc(100vh-4rem)] overflow-hidden">
      
      <Tabs defaultValue="lab" className="flex flex-col h-full gap-6">
        <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="lab">Backtest Lab</TabsTrigger>
            <TabsTrigger value="governance">Governance & Staging</TabsTrigger>
        </TabsList>

        <TabsContent value="lab" className="flex-1 flex flex-col gap-6 mt-0 min-h-0">
            {/* Top Section: Strategy Configuration */}
            <div className="flex-none grid grid-cols-12 gap-6 h-[55%]">
                {/* Editor Area */}
                <div className="col-span-12 lg:col-span-8 h-full min-h-0">
                    <StrategyEditor />
                </div>
                
                {/* Helper Panel */}
                <div className="col-span-12 lg:col-span-4 h-full min-h-0 flex flex-col gap-6">
                    <Card className="flex-1 bg-muted/10 border-dashed min-h-0">
                        <CardHeader>
                            <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">Validation Tracker</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center h-full text-xs text-zinc-600 italic">
                            No active validations.
                        </CardContent>
                    </Card>
                    <Card className="flex-1 bg-muted/10 border-dashed min-h-0">
                        <CardHeader>
                            <CardTitle className="text-muted-foreground text-sm uppercase tracking-wider">Market Regime</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center h-full text-xs text-zinc-600 italic">
                            Analyzing regime...
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Bottom Section: Backtest History */}
            <div className="flex-1 min-h-0">
                <BacktestList />
            </div>
        </TabsContent>

        <TabsContent value="governance" className="flex-1 mt-0 min-h-0">
            <StrategyGovernance />
        </TabsContent>
      </Tabs>
    </div>
  )
}
