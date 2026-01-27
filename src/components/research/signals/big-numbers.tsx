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
      <Card className="bg-zinc-950 border-zinc-800 p-6 flex flex-col items-center justify-center">
        <span className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Rank</span>
        <span className="text-6xl font-black text-white tracking-tighter italic">#{rank}</span>
      </Card>
      
      <Card className="bg-zinc-950 border-zinc-800 p-6 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
        <span className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Weight</span>
        <span className="text-6xl font-black text-emerald-500 tracking-tighter italic">{weight}%</span>
      </Card>

      <Card className="bg-zinc-950 border-zinc-800 p-6 flex flex-col items-center justify-center">
        <span className="text-zinc-500 text-xs uppercase tracking-widest font-mono mb-2">Factor Score</span>
        <span className="text-6xl font-black text-white tracking-tighter italic">{score.toFixed(2)}</span>
      </Card>
    </div>
  )
}
