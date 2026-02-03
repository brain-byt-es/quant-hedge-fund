"use client"

import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Activity, FlaskConical, Radio } from "lucide-react"
import { cn } from "@/lib/utils"

export function HeaderContextBadge() {
  const pathname = usePathname()

  const isTactical = pathname.includes("/tactical") || pathname.includes("/live") || pathname.includes("/ai-quant")
  const isQuant = pathname.includes("/research") || pathname.includes("/signals") || pathname.includes("/governance")

  if (isTactical) {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-orange-500 uppercase tracking-widest bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.1)]">
        <Radio className="h-3 w-3 animate-pulse" />
        LIVE DATA ACTIVE
      </div>
    )
  }

  if (isQuant) {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
        <FlaskConical className="h-3 w-3" />
        CORE RESEARCH MODE
      </div>
    )
  }

  return (
    <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-1 rounded border border-border">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        Neural Bridge Linked
    </div>
  )
}
