"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Award, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface BigNumbersProps {
  rank: number
  weight: number
  score: number
}

export function BigNumbers({ rank, weight, score }: BigNumbersProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card className="bg-card/40 border-border backdrop-blur-sm shadow-sm overflow-hidden group">
        <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Universe Rank</span>
                <Award className="h-3.5 w-3.5 text-primary opacity-50" />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-black text-foreground tracking-tighter italic">#{rank}</span>
                <span className="text-[10px] text-muted-foreground font-mono">/ 37k</span>
            </div>
        </CardContent>
      </Card>
      
      <Card className="bg-card/40 border-border backdrop-blur-sm shadow-sm overflow-hidden group border-primary/20">
        <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Portfolio Weight</span>
                <Zap className="h-3.5 w-3.5 text-primary opacity-50" />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-black text-primary tracking-tighter italic">{weight}%</span>
                <span className="text-[10px] text-muted-foreground font-mono">Target</span>
            </div>
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border backdrop-blur-sm shadow-sm overflow-hidden group">
        <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Factor Score</span>
                <TrendingUp className="h-3.5 w-3.5 text-primary opacity-50" />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-black text-foreground tracking-tighter italic">{score.toFixed(2)}</span>
                <Badge variant="outline" className="ml-2 h-4 text-[8px] border-primary/30 text-primary uppercase tracking-tighter">High Alpha</Badge>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}