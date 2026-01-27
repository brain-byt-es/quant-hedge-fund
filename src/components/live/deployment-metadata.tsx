"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Monitor, History } from "lucide-react"

export function DeploymentMetadata() {

  return (

    <Accordion type="single" collapsible className="w-full">

      <AccordionItem value="metadata" className="border-border">

        <AccordionTrigger className="hover:no-underline py-2 px-4 bg-muted/30 text-muted-foreground text-xs uppercase tracking-widest font-mono">

            <div className="flex items-center gap-4">

                <span className="flex items-center gap-2 text-primary"><Monitor className="h-3 w-3" /> Live Deployment: ALPHA_V2</span>

                <span className="flex items-center gap-2 text-muted-foreground/60"><History className="h-3 w-3" /> Latest Nightly: 2026-01-24 OK</span>

            </div>

        </AccordionTrigger>

        <AccordionContent className="p-4 bg-background">

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">

            <div className="space-y-2">

                <h4 className="text-[10px] uppercase text-muted-foreground font-bold opacity-60">Strategy Info</h4>

                <div className="text-xs space-y-1">

                    <div className="flex justify-between font-mono"><span>Alias:</span> <span className="text-primary">momentum_trend_follower</span></div>

                    <div className="flex justify-between font-mono"><span>Version:</span> <span className="text-foreground">2.1.0-stable</span></div>

                    <div className="flex justify-between font-mono"><span>Engine:</span> <span className="text-foreground">Zipline Reloaded</span></div>

                </div>

            </div>

            <div className="space-y-2">

                <h4 className="text-[10px] uppercase text-muted-foreground font-bold opacity-60">Environment</h4>

                <div className="text-xs space-y-1">

                    <div className="flex justify-between font-mono"><span>Docker:</span> <span className="text-muted-foreground text-[10px]">quant-backend:latest</span></div>

                    <div className="flex justify-between font-mono"><span>Started:</span> <span className="text-foreground">2026-01-20 09:30</span></div>

                    <div className="flex justify-between font-mono"><span>Region:</span> <span className="text-foreground">AWS-US-EAST-1</span></div>

                </div>

            </div>

            <div className="space-y-2 border-l border-border pl-8">

                <h4 className="text-[10px] uppercase text-muted-foreground font-bold opacity-60">Last Validation</h4>

                <div className="text-xs space-y-1">

                    <div className="flex justify-between font-mono"><span>Sharpe:</span> <span className="text-primary">2.45</span></div>

                    <div className="flex justify-between font-mono"><span>Monte Carlo P:</span> <span className="text-primary">0.02</span></div>

                    <div className="flex justify-between font-mono"><span>Drift:</span> <Badge variant="outline" className="text-[9px] h-4 py-0 bg-primary/10 text-primary border-primary/20">Stable</Badge></div>

                </div>

            </div>

            <div className="space-y-2 pl-8">

                <h4 className="text-[10px] uppercase text-muted-foreground font-bold opacity-60">Data Coverage</h4>

                <div className="text-xs space-y-1">

                    <div className="flex justify-between font-mono"><span>Stocks:</span> <span className="text-foreground">37,368</span></div>

                    <div className="flex justify-between font-mono"><span>History:</span> <span className="text-foreground">5 Years</span></div>

                    <div className="flex justify-between font-mono"><span>Status:</span> <span className="text-primary">Synched</span></div>

                </div>

            </div>

          </div>

        </AccordionContent>

      </AccordionItem>

    </Accordion>

  )

}
