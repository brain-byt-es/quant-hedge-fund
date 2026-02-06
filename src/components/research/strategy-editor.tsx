"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { Play, Save, FileCode, Sparkles, Code } from "lucide-react"

export function StrategyEditor() {
  const [loading, setLoading] = useState(false)
  const [stratName, setStratName] = useState("Momentum_Standard")
  const [universe, setUniverse] = useState("sp500")
  const [bundle, setBundle] = useState("momentum_test_bundle")
  const [algoCode, setAlgoCode] = useState(`# Example: Simple Moving Average Crossover
def compute_signals(context, data):
    hist = data.history(context.assets, 'price', 50, '1d')
    sma_50 = hist.mean()
    sma_20 = hist[-20:].mean()
    
    return sma_20 > sma_50`)
    
  // AI State
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiCodePrompt, setAiCodePrompt] = useState("")

  const handleRunBacktest = async () => {
      setLoading(true)
      try {
          await api.runBacktest({
              strategy_name: stratName,
              bundle_name: bundle,
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

  const handleGenerateStrategy = async () => {
      if (!aiPrompt) return;
      setLoading(true);
      try {
          const config = await api.generateStrategyConfig(aiPrompt);
          if (config) {
              setStratName(config.strategy_name || stratName);
              // In a real app, we would populate more form fields
              alert(`AI generated config for ${config.strategy_name}`);
          }
      } catch (e) {
          alert("AI Generation failed: " + String(e));
      } finally {
          setLoading(false);
      }
  }

  const handleGenerateCode = async () => {
      if (!aiCodePrompt) return;
      setLoading(true);
      try {
          const result = await api.generateFactorCode(aiCodePrompt);
          if (result && result.code) {
              setAlgoCode(prev => prev + "\n\n" + result.code);
          }
      } catch (e) {
          alert("AI Code Gen failed: " + String(e));
      } finally {
          setLoading(false);
      }
  }

  return (
    <Card className="h-full border-dashed flex flex-col">
      <CardHeader>
        <CardTitle>Strategy Definition</CardTitle>
        <CardDescription>Configure factor models and execution rules.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <Tabs defaultValue="manual" className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="manual">Manual Config</TabsTrigger>
                <TabsTrigger value="ai">AI Assistant</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 flex-1">
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
                    <div className="space-y-2">
                        <Label>Data Bundle</Label>
                        <Select value={bundle} onValueChange={setBundle}>
                            <SelectTrigger className="font-mono text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="momentum_test_bundle">Momentum Test (Fast)</SelectItem>
                                <SelectItem value="historical_prices_fmp">FMP Global (Slow/67k)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                    <Label className="flex items-center gap-2">
                        <FileCode className="h-4 w-4" /> Algorithm Logic (Python)
                    </Label>
                    <Textarea 
                        className="font-mono text-xs flex-1 min-h-[200px] bg-muted/50" 
                        placeholder="# Define your trading logic here..."
                        value={algoCode}
                        onChange={(e) => setAlgoCode(e.target.value)}
                    />
                </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-6 flex-1">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-bold">
                        <Sparkles className="h-4 w-4" /> Strategy Generator
                    </Label>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="e.g. 'Momentum strategy for Tech stocks with low drawdown'" 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                        />
                        <Button onClick={handleGenerateStrategy} disabled={loading}>Generate</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Generates a JSON configuration and pre-fills the manual form.</p>
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-bold">
                        <Code className="h-4 w-4" /> Alpha Factor Coder
                    </Label>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="e.g. 'RSI divergence detector'" 
                            value={aiCodePrompt}
                            onChange={(e) => setAiCodePrompt(e.target.value)}
                        />
                        <Button variant="secondary" onClick={handleGenerateCode} disabled={loading}>Write Code</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Generates Python code snippet and appends it to the editor.</p>
                </div>
            </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="secondary" className="gap-2">
                <Save className="h-4 w-4" /> Save
            </Button>
            <Button className="gap-2" onClick={handleRunBacktest} disabled={loading}>
                <Play className="h-4 w-4" /> 
                {loading ? "Processing..." : "Run Backtest"}
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}
