"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { Play, Save, FileCode } from "lucide-react"

export function StrategyEditor() {
  const [loading, setLoading] = useState(false)
  const [stratName, setStratName] = useState("Momentum_Standard")
  const [universe, setUniverse] = useState("sp500")

  const handleRunBacktest = async () => {
      setLoading(true)
      try {
          await api.runBacktest({
              strategy_name: stratName,
              start_date: "2020-01-01",
              end_date: "2024-12-31",
              capital_base: 100000,
              params: {
                  window: 20,
                  universe: universe
              }
          })
          alert("Backtest started in background! Check the history below in a moment.")
      } catch (e) {
          alert("Failed to start backtest: " + String(e))
      } finally {
          setLoading(false)
      }
  }

  return (
    <Card className="h-full border-dashed">
      <CardHeader>
        <CardTitle>Strategy Definition</CardTitle>
        <CardDescription>Configure factor models and execution rules.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Strategy Name</Label>
                <Input value={stratName} onChange={(e) => setStratName(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label>Target Universe</Label>
                <Select value={universe} onValueChange={setUniverse}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="sp500">S&P 500 Constituents</SelectItem>
                        <SelectItem value="nasdaq100">NASDAQ 100</SelectItem>
                        <SelectItem value="custom">Custom List</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="space-y-2">
            <Label className="flex items-center gap-2">
                <FileCode className="h-4 w-4" /> Algorithm Logic (Python)
            </Label>
            <Textarea 
                className="font-mono text-xs h-[150px] bg-muted/50" 
                placeholder="# Define your trading logic here..."
                defaultValue={`# Example: Simple Moving Average Crossover
def compute_signals(context, data):
    hist = data.history(context.assets, 'price', 50, '1d')
    sma_50 = hist.mean()
    sma_20 = hist[-20:].mean()
    
    return sma_20 > sma_50`}
            />
        </div>

        <div className="flex justify-end gap-2">
            <Button variant="secondary" className="gap-2">
                <Save className="h-4 w-4" /> Save
            </Button>
            <Button className="gap-2" onClick={handleRunBacktest} disabled={loading}>
                <Play className="h-4 w-4" /> 
                {loading ? "Initializing..." : "Run Backtest"}
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}
