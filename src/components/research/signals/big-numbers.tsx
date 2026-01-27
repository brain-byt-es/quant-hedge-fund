"use client"

import { Card } from "@/components/ui/card"

interface BigNumbersProps {
  rank: number
  weight: number
  score: number
}

export function BigNumbers({ rank, weight, score }: BigNumbersProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card className="bg-background border-border p-6 flex flex-col items-center justify-center shadow-lg">
        <span className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-mono mb-2">Rank</span>
        <span className="text-6xl font-black text-foreground tracking-tighter italic">#{rank}</span>
      </Card>
      
      <Card className="bg-background border-border p-6 flex flex-col items-center justify-center shadow-[0_0_20px_var(--primary)]/10">
        <span className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-mono mb-2">Weight</span>
        <span className="text-6xl font-black text-primary tracking-tighter italic">{weight}%</span>
      </Card>

      <Card className="bg-background border-border p-6 flex flex-col items-center justify-center shadow-lg">
        <span className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-mono mb-2">Factor Score</span>
        <span className="text-6xl font-black text-foreground tracking-tighter italic">{score.toFixed(2)}</span>
      </Card>
    </div>
  )
}
