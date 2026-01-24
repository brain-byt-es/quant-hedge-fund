"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, OrderParams } from "@/lib/api"

export function OrderTicket() {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [symbol, setSymbol] = useState("")
  const [quantity, setQuantity] = useState("")
  const [orderType, setOrderType] = useState("MKT")
  const [limitPrice, setLimitPrice] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!symbol || !quantity) return;
    setLoading(true);
    try {
        const order: OrderParams = {
            symbol: symbol.toUpperCase(),
            quantity: parseInt(quantity),
            side,
            order_type: orderType,
            limit_price: orderType === 'LMT' ? parseFloat(limitPrice) : undefined
        };
        await api.submitOrder(order);
        alert(`Order Submitted: ${side} ${quantity} ${symbol}`);
        setQuantity(""); // Reset simple fields
    } catch (e) {
        alert("Order Failed: " + String(e));
    } finally {
        setLoading(false);
    }
  }

  return (
    <Card className="h-full border-border">
      <CardHeader>
        <CardTitle>Manual Execution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={side.toLowerCase()} onValueChange={(v) => setSide(v.toUpperCase() as 'BUY' | 'SELL')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy" className="data-[state=active]:bg-emerald-900 data-[state=active]:text-emerald-100">BUY</TabsTrigger>
                <TabsTrigger value="sell" className="data-[state=active]:bg-rose-900 data-[state=active]:text-rose-100">SELL</TabsTrigger>
            </TabsList>
        </Tabs>

        <div className="grid gap-2">
            <Label>Symbol</Label>
            <Input 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. AAPL" 
                className="uppercase font-mono" 
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100" 
                />
            </div>
            <div className="grid gap-2">
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="MKT">Market</SelectItem>
                        <SelectItem value="LMT">Limit</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="grid gap-2">
             <Label>Limit Price</Label>
             <Input 
                type="number" 
                placeholder="0.00" 
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                disabled={orderType !== "LMT"} 
                className={orderType !== "LMT" ? "bg-muted" : ""} 
             />
        </div>

        <Button 
            className="w-full mt-4" 
            size="lg" 
            variant={side === "BUY" ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={loading}
        >
            {loading ? "Sending..." : `Submit ${side} Order`}
        </Button>
      </CardContent>
    </Card>
  )
}
