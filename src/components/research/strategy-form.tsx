"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Play } from "lucide-react"

export function StrategyForm() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Strategy Parameters</CardTitle>
        <CardDescription>Configure backtest variables</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="strategy-name">Strategy Name</Label>
          <Input id="strategy-name" placeholder="e.g. Momentum Alpha v1" defaultValue="Mean Reversion SPY" />
        </div>

        <div className="grid gap-2">
          <Label>Capital Allocation</Label>
          <div className="flex items-center gap-4">
             <Slider defaultValue={[100000]} max={1000000} step={1000} className="flex-1" />
             <span className="font-mono text-sm w-20 text-right">$100k</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Lookback Window</Label>
            <Input type="number" defaultValue={30} className="font-mono" />
          </div>
          <div className="grid gap-2">
            <Label>Leverage</Label>
            <Select defaultValue="1.0">
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.0">1.0x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2.0">2.0x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="stop-loss" className="flex flex-col gap-1">
            <span>Stop Loss</span>
            <span className="font-normal text-xs text-muted-foreground">Auto-close positions at -5%</span>
          </Label>
          <Switch id="stop-loss" defaultChecked />
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button className="w-full" size="lg">
          <Play className="mr-2 h-4 w-4" /> Run Backtest
        </Button>
      </CardFooter>
    </Card>
  )
}
