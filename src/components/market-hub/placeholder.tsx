"use client"

import { Construction } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PlaceholderProps {
  title: string
  feature: string
}

export function MarketHubPlaceholder({ title, feature }: PlaceholderProps) {
  return (
    <div className="flex flex-col h-full space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter italic uppercase flex items-center gap-2 text-primary">
            {title}
          </h2>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.3em] font-bold mt-1">
            Market Hub Module // {feature}
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <Card className="max-w-md w-full border-dashed border-primary/20 bg-primary/5 backdrop-blur-sm">
            <CardHeader className="text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                    <Construction className="h-8 w-8 text-primary animate-bounce" />
                </div>
                <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Module Ingress Pending</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    This Stocknear-cloned module is being mapped to our high-performance DuckDB data lake. 
                    Real-time ingestion for <strong className="text-foreground">{feature}</strong> will be active shortly.
                </p>
                <div className="flex flex-col gap-2 pt-4">
                    <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase">
                        <span>Architecture Match</span>
                        <span className="text-green-500 font-bold">100% (Stocknear)</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase">
                        <span>Data Provider</span>
                        <span className="text-primary font-bold text-[9px]">FMP STABLE V3</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}