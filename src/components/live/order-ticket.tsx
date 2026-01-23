"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function OrderTicket() {
  return (
    <Card className="h-full border-border">
      <CardHeader>
        <CardTitle>Manual Execution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="buy" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy" className="data-[state=active]:bg-emerald-900 data-[state=active]:text-emerald-100">BUY</TabsTrigger>
                <TabsTrigger value="sell" className="data-[state=active]:bg-rose-900 data-[state=active]:text-rose-100">SELL</TabsTrigger>
            </TabsList>
        </Tabs>

        <div className="grid gap-2">
            <Label>Symbol</Label>
            <Input placeholder="e.g. AAPL" className="uppercase font-mono" />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input type="number" placeholder="100" />
            </div>
            <div className="grid gap-2">
                <Label>Order Type</Label>
                <Select defaultValue="market">
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="market">Market</SelectItem>
                        <SelectItem value="limit">Limit</SelectItem>
                        <SelectItem value="stop">Stop</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="grid gap-2">
             <Label>Limit Price</Label>
             <Input type="number" placeholder="0.00" disabled className="bg-muted" />
        </div>

        <Button className="w-full mt-4" size="lg" variant="default">
            Submit Order
        </Button>
      </CardContent>
    </Card>
  )
}
