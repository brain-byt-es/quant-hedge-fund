"use client"

import { StrategyGovernance } from "@/components/research/strategy-governance"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function GovernanceContent() {
  const searchParams = useSearchParams()
  const initialData = {
      strategy_name: searchParams.get("strategy_name"),
      run_id: searchParams.get("run_id"),
      sharpe: searchParams.get("sharpe"),
      return: searchParams.get("return")
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6 h-full">
      <div className="flex flex-col gap-1 px-1 shrink-0">
          <h1 className="text-2xl font-black tracking-tighter italic uppercase">Strategy Governance</h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.3em] font-bold">Audit Trail // Compliance // Approval</p>
      </div>
      
      <div className="flex-1 min-h-0">
          <StrategyGovernance initialData={initialData} />
      </div>
    </div>
  )
}

export default function GovernancePage() {
  return (
    <Suspense fallback={<div>Loading Governance...</div>}>
      <GovernanceContent />
    </Suspense>
  )
}
