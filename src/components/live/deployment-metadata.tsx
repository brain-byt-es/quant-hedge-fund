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
      <AccordionItem value="metadata" className="border-zinc-800">
        <AccordionTrigger className="hover:no-underline py-2 px-4 bg-zinc-900/30 text-zinc-400 text-xs uppercase tracking-widest font-mono">
            <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-emerald-500"><Monitor className="h-3 w-3" /> Live Deployment: ALPHA_V2</span>
                <span className="flex items-center gap-2"><History className="h-3 w-3" /> Latest Nightly: 2026-01-24 OK</span>
            </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 bg-zinc-950">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-2">
                <h4 className="text-[10px] uppercase text-zinc-600 font-bold">Strategy Info</h4>
                <div className="text-xs space-y-1">
                    <div className="flex justify-between font-mono"><span>Alias:</span> <span className="text-primary">momentum_trend_follower</span></div>
                    <div className="flex justify-between font-mono"><span>Version:</span> <span>2.1.0-stable</span></div>
                    <div className="flex justify-between font-mono"><span>Engine:</span> <span>Zipline Reloaded</span></div>
                </div>
            </div>
            <div className="space-y-2">
                <h4 className="text-[10px] uppercase text-zinc-600 font-bold">Environment</h4>
                <div className="text-xs space-y-1">
                    <div className="flex justify-between font-mono"><span>Docker:</span> <span className="text-zinc-400 text-[10px]">quant-backend:latest</span></div>
                    <div className="flex justify-between font-mono"><span>Started:</span> <span>2026-01-20 09:30</span></div>
                    <div className="flex justify-between font-mono"><span>Region:</span> <span>AWS-US-EAST-1</span></div>
                </div>
            </div>
            <div className="space-y-2 border-l border-zinc-800 pl-8">
                <h4 className="text-[10px] uppercase text-zinc-600 font-bold">Last Validation</h4>
                <div className="text-xs space-y-1">
                    <div className="flex justify-between font-mono"><span>Sharpe:</span> <span className="text-emerald-500">2.45</span></div>
                    <div className="flex justify-between font-mono"><span>Monte Carlo P:</span> <span className="text-emerald-500">0.02</span></div>
                    <div className="flex justify-between font-mono"><span>Drift:</span> <Badge variant="outline" className="text-[9px] h-4 py-0 bg-emerald-950/20 text-emerald-500 border-emerald-900">Stable</Badge></div>
                </div>
            </div>
            <div className="space-y-2 pl-8">
                <h4 className="text-[10px] uppercase text-zinc-600 font-bold">Data Coverage</h4>
                <div className="text-xs space-y-1">
                    <div className="flex justify-between font-mono"><span>Stocks:</span> <span>37,368</span></div>
                    <div className="flex justify-between font-mono"><span>History:</span> <span>5 Years</span></div>
                    <div className="flex justify-between font-mono"><span>Status:</span> <span className="text-emerald-500">Synched</span></div>
                </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}