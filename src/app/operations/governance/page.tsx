"use client"

import { StrategyGovernance } from "@/components/research/strategy-governance"

export default function GovernancePage() {
  return (
    <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6 h-full">
      <div className="flex flex-col gap-1 px-1 shrink-0">
          <h1 className="text-2xl font-black tracking-tighter italic uppercase">Strategy Governance</h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.3em] font-bold">Audit Trail // Compliance // Approval</p>
      </div>
      
      <div className="flex-1 min-h-0">
          <StrategyGovernance />
      </div>
    </div>
  )
}
