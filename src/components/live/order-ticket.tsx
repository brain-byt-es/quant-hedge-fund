"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { api } from "@/lib/api"

export function OrderTicket() {

  const [symbol, setSymbol] = useState("")

  const [qty, setQty] = useState("")

  const [side, setSide] = useState("BUY")

  const [loading, setLoading] = useState(false)



  const handleSubmit = async () => {

      if (!symbol || !qty) return

      setLoading(true)

      try {

          await api.submitOrder({

              symbol: symbol.toUpperCase(),

              quantity: parseInt(qty),

              side: side as 'BUY' | 'SELL'

          })

          alert("Order Placed")

          setSymbol("")

          setQty("")

      } catch {

          alert("Order Failed")

      } finally {

          setLoading(false)

      }

  }



  return (

    <Card className="h-full border-border bg-card">

        <CardHeader className="py-3 border-b border-border">

            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Manual Execution</CardTitle>

        </CardHeader>

        <CardContent className="p-4 space-y-3">

            <div className="grid grid-cols-2 gap-2">

                <Input 

                    placeholder="SYMBOL" 

                    className="bg-background border-border font-mono text-xs uppercase"

                    value={symbol}

                    onChange={(e) => setSymbol(e.target.value)}

                />

                <Input 

                    placeholder="QTY" 

                    type="number"

                    className="bg-background border-border font-mono text-xs"

                    value={qty}

                    onChange={(e) => setQty(e.target.value)}

                />

            </div>

            <div className="grid grid-cols-2 gap-2">

                <Select value={side} onValueChange={setSide}>

                    <SelectTrigger className="bg-background border-border h-9 text-xs font-mono">

                        <SelectValue />

                    </SelectTrigger>

                    <SelectContent>

                        <SelectItem value="BUY">BUY</SelectItem>

                        <SelectItem value="SELL">SELL</SelectItem>

                    </SelectContent>

                </Select>

                <Select disabled>

                    <SelectTrigger className="bg-background border-border h-9 text-xs font-mono opacity-50">

                        <SelectValue placeholder="MARKET" />

                    </SelectTrigger>

                </Select>

            </div>

            <Button 

                className={`w-full font-mono uppercase tracking-widest text-xs h-9 ${side === 'BUY' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'}`}

                onClick={handleSubmit}

                disabled={loading}

            >

                {loading ? "Transmitting..." : `Submit ${side} Order`}

            </Button>

        </CardContent>

    </Card>

  )

}
