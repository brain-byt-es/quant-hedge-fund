"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PortfolioChart } from "@/components/dashboard/portfolio-chart" // Reusing chart for demo

export function ResultsView() {
  return (
    <Tabs defaultValue="tearsheet" className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
         <TabsList>
            <TabsTrigger value="tearsheet">Tear Sheet</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
         </TabsList>
      </div>
      
      <TabsContent value="tearsheet" className="flex-1 min-h-0">
         <div className="grid gap-4 h-full overflow-auto pb-4">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <Card className="bg-primary/5 border-primary/20 shadow-sm">
                    <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Total Return</CardTitle></CardHeader>
                    <CardContent className="p-4 pt-0 text-2xl font-mono text-primary">+45.2%</CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Sharpe</CardTitle></CardHeader>
                    <CardContent className="p-4 pt-0 text-2xl font-mono">1.82</CardContent>
                 </Card>
                 <Card className="bg-destructive/5 border-destructive/20 shadow-sm">
                    <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Max Drawdown</CardTitle></CardHeader>
                    <CardContent className="p-4 pt-0 text-2xl font-mono text-destructive">-12.4%</CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Beta</CardTitle></CardHeader>
                    <CardContent className="p-4 pt-0 text-2xl font-mono">0.85</CardContent>
                 </Card>
             </div>
             <PortfolioChart />
         </div>
      </TabsContent>
      
      <TabsContent value="logs" className="flex-1 min-h-0">
        <Card className="h-full bg-black border-border">
            <ScrollArea className="h-[400px] p-4 font-mono text-xs text-green-500">
                <div className="opacity-70">[INFO] Zipline: Running backtest from 2020-01-01 to 2023-12-31</div>
                <div className="opacity-70">[INFO] Loader: Loaded 503 assets</div>
                <div>[DATA] 2020-01-02: BUY 100 AAPL @ 75.08</div>
                <div>[DATA] 2020-01-05: SELL 50 AAPL @ 78.20</div>
                <div className="text-yellow-500">[WARN] Slippage model adjusted for volatility</div>
                <div>[DATA] 2020-02-14: BUY 200 MSFT @ 165.20</div>
                <div className="mt-2">... (showing last 100 lines)</div>
            </ScrollArea>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
