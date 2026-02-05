"use client"

import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
    IconHistory,
    IconCircleCheck,
    IconClock,
    IconAlertCircle,
    IconArrowUpRight,
    IconArrowDownRight
} from "@tabler/icons-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export interface OrderExecution {
  id: string
  symbol: string
  action: 'BUY' | 'SELL'
  quantity: number
  filled_qty: number
  avg_fill_price: number
  order_type: string
  status: string
  created_at: string | null
}

interface OrderBlotterProps {
  orders: OrderExecution[]
  isLoading?: boolean
}

export function OrderBlotter({ orders, isLoading }: OrderBlotterProps) {
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes("filled")) return <Badge className="bg-emerald-500/10 text-emerald-500 border-none flex gap-1 items-center h-5 text-[9px] font-black"><IconCircleCheck className="size-3" /> FILLED</Badge>
    if (s.includes("pending") || s.includes("submitted")) return <Badge className="bg-amber-500/10 text-amber-500 border-none flex gap-1 items-center h-5 text-[9px] font-black"><IconClock className="size-3" /> PENDING</Badge>
    if (s.includes("cancel") || s.includes("reject")) return <Badge className="bg-red-500/10 text-red-500 border-none flex gap-1 items-center h-5 text-[9px] font-black"><IconAlertCircle className="size-3" /> REJECTED</Badge>
    return <Badge variant="outline" className="text-[9px] font-black">{status.toUpperCase()}</Badge>
  }

  return (
    <Card className="border-border/50 bg-card/20 backdrop-blur-md">
      <CardHeader className="py-3 border-b border-border/50">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <IconHistory className="size-3.5 text-primary" /> Live Order Blotter
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent h-8 border-b border-border/50">
              <TableHead className="text-[9px] uppercase font-black px-4">Time</TableHead>
              <TableHead className="text-[9px] uppercase font-black px-4">Ticker</TableHead>
              <TableHead className="text-[9px] uppercase font-black px-4">Side</TableHead>
              <TableHead className="text-[9px] uppercase font-black px-4">Fill / Total</TableHead>
              <TableHead className="text-[9px] uppercase font-black px-4 text-right">Price</TableHead>
              <TableHead className="text-[9px] uppercase font-black px-4 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="h-10 animate-pulse">
                  <TableCell colSpan={6} className="px-4"><div className="h-4 bg-muted rounded w-full" /></TableCell>
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-[10px] text-muted-foreground uppercase font-bold italic tracking-widest">
                  No orders recorded in current session
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="h-10 hover:bg-muted/30 border-b border-border/10 transition-colors group">
                  <TableCell className="px-4 py-2 text-[10px] font-mono text-muted-foreground">
                    {order.created_at ? format(new Date(order.created_at), "HH:mm:ss") : "--:--:--"}
                  </TableCell>
                  <TableCell className="px-4 py-2 font-black text-xs tracking-tighter">
                    {order.symbol}
                  </TableCell>
                  <TableCell className="px-4 py-2">
                    <span className={cn(
                        "flex items-center gap-1 text-[10px] font-black uppercase",
                        order.action === "BUY" ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {order.action === "BUY" ? <IconArrowUpRight className="size-3" /> : <IconArrowDownRight className="size-3" />}
                        {order.action}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-2 font-mono text-[10px]">
                    <span className={cn(order.filled_qty === order.quantity ? "text-primary font-bold" : "text-muted-foreground")}>
                        {order.filled_qty}
                    </span>
                    <span className="opacity-30 mx-1">/</span>
                    <span className="opacity-50">{order.quantity}</span>
                  </TableCell>
                  <TableCell className="px-4 py-2 text-right font-mono text-[10px] font-bold">
                    {order.avg_fill_price > 0 ? `$${order.avg_fill_price.toFixed(2)}` : "--"}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-right">
                    <div className="flex justify-end">
                        {getStatusBadge(order.status)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
