"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Play, Loader2 } from "lucide-react"

interface StrategyConfig {
  strategy_name: string
  capital_base: number
  start_date: string
  end_date: string
  params: {
    lookback: number
    leverage: number
    stop_loss_enabled: boolean
  }
}

interface StrategyFormProps {
  onSubmit: (config: StrategyConfig) => void
  isLoading?: boolean
}

export function StrategyForm({ onSubmit, isLoading }: StrategyFormProps) {
  const [name, setName] = useState("Mean Reversion SPY")
  const [capital, setCapital] = useState(100000)
  const [lookback, setLookback] = useState(30)
  const [leverage, setLeverage] = useState("1.0")
  const [stopLoss, setStopLoss] = useState(true)
  const [startDate, setStartDate] = useState("2023-01-01")
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = () => {
    onSubmit({
      strategy_name: name,
      capital_base: capital,
      start_date: startDate,
      end_date: endDate,
      params: {
        lookback: lookback,
        leverage: parseFloat(leverage),
        stop_loss_enabled: stopLoss
      }
    })
  }

  return (
    <Card className="h-full flex flex-col border-border bg-card/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-black uppercase tracking-widest">Strategy Parameters</CardTitle>
        <CardDescription className="text-[10px] uppercase font-mono">Configure backtest variables</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="strategy-name" className="text-[10px] font-bold uppercase text-muted-foreground">Strategy Name</Label>
          <Input 
            id="strategy-name" 
            className="h-8 bg-background border-border text-xs font-bold" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Start Date</Label>
            <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 bg-background border-border font-mono text-[10px]" 
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">End Date</Label>
            <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 bg-background border-border font-mono text-[10px]" 
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground flex justify-between">
            <span>Capital Allocation</span>
            <span className="font-mono text-primary">${(capital/1000).toFixed(0)}k</span>
          </Label>
          <Slider 
            value={[capital]} 
            onValueChange={(val) => setCapital(val[0])}
            max={1000000} 
            step={10000} 
            className="py-2" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Lookback (Days)</Label>
            <Input 
                type="number" 
                value={lookback} 
                onChange={(e) => setLookback(parseInt(e.target.value))}
                className="h-8 bg-background border-border font-mono text-xs" 
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Leverage</Label>
            <Select value={leverage} onValueChange={setLeverage}>
              <SelectTrigger className="h-8 bg-background border-border text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.0">1.0x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2.0">2.0x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center justify-between space-x-2 py-2 border-t border-border/30 mt-2">
          <Label htmlFor="stop-loss" className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase">Stop Loss</span>
            <span className="font-normal text-[9px] text-muted-foreground uppercase">Auto-close positions at -5%</span>
          </Label>
          <Switch 
            id="stop-loss" 
            checked={stopLoss}
            onCheckedChange={setStopLoss}
          />
        </div>
      </CardContent>
      <CardFooter className="mt-auto pt-4 border-t border-border/30">
        <Button 
            className="w-full h-10 text-xs font-black uppercase tracking-[0.2em] shadow-lg" 
            size="lg"
            onClick={handleSubmit}
            disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4 fill-current" />}
          Run Simulation
        </Button>
      </CardFooter>
    </Card>
  )
}
