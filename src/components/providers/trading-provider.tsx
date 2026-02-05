"use client"

import React, { createContext, useContext, useState } from "react"
import { api, OrderParams } from "@/lib/api"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    IconTarget, 
    IconBolt,
    IconLoader2
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface TradingContextType {
  openOrder: (symbol: string, side?: 'BUY' | 'SELL') => void
}

const TradingContext = createContext<TradingContextType | undefined>(undefined)

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [symbol, setSymbol] = useState("")
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState(100)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openOrder = (newSymbol: string, newSide: 'BUY' | 'SELL' = 'BUY') => {
    setSymbol(newSymbol.toUpperCase())
    setSide(newSide)
    setIsOpen(true)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const params: OrderParams = {
        symbol,
        quantity,
        side,
        order_type: "MARKET"
      }
      await api.submitOrder(params)
      toast.success(`${side} order submitted for ${symbol}`, {
        description: `Quantity: ${quantity} shares @ Market`
      })
      setIsOpen(false)
    } catch (err) {
      toast.error("Execution Failed", {
        description: String(err)
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <TradingContext.Provider value={{ openOrder }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest italic">
                <IconTarget className="size-4 text-primary" /> Omega Execution Link
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Symbol</span>
                    <span className="text-2xl font-black font-mono tracking-tighter">{symbol}</span>
                </div>
                <div className="flex gap-1 bg-background p-1 rounded-lg border border-border/50">
                    <Button 
                        size="sm" 
                        variant={side === 'BUY' ? 'default' : 'ghost'}
                        className={cn(
                            "h-8 text-[10px] font-black uppercase tracking-widest px-4 rounded-md transition-all",
                            side === 'BUY' ? "bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.3)]" : "text-muted-foreground"
                        )}
                        onClick={() => setSide('BUY')}
                    >
                        Buy
                    </Button>
                    <Button 
                        size="sm" 
                        variant={side === 'SELL' ? 'destructive' : 'ghost'}
                        className={cn(
                            "h-8 text-[10px] font-black uppercase tracking-widest px-4 rounded-md transition-all",
                            side === 'SELL' ? "bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]" : "text-muted-foreground"
                        )}
                        onClick={() => setSide('SELL')}
                    >
                        Sell
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Quantity</Label>
                        <div className="relative">
                            <Input 
                                type="number" 
                                value={quantity} 
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="h-10 bg-background/50 border-border/50 font-mono font-bold"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Order Type</Label>
                        <div className="h-10 flex items-center px-3 bg-muted/20 border border-border/50 rounded-md text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Market
                        </div>
                    </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg flex items-start gap-3">
                    <IconBolt className="size-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium leading-relaxed text-primary/80">
                        Orders are routed through the Omega Risk Engine and executed via IBKR Institutional Bridge.
                    </p>
                </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
                className={cn(
                    "w-full h-12 text-sm font-black uppercase tracking-[0.2em] transition-all",
                    side === 'BUY' ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
                )}
                disabled={isSubmitting || quantity <= 0}
                onClick={handleSubmit}
            >
                {isSubmitting ? (
                    <IconLoader2 className="size-5 animate-spin" />
                ) : (
                    <>Confirm {side} Order</>
                )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TradingContext.Provider>
  )
}

export const useTrading = () => {
  const context = useContext(TradingContext)
  if (context === undefined) {
    throw new Error("useTrading must be used within a TradingProvider")
  }
  return context
}
