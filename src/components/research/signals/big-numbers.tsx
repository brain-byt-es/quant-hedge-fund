"use client"

import { Card, CardContent } from "@/components/ui/card"

import { TrendingUp, Award, Zap, ShieldCheck, Activity } from "lucide-react"

import { Badge } from "@/components/ui/badge"



interface BigNumbersProps {

  rank: number

  weight: number

  score: number

}



export function BigNumbers({ rank, weight, score }: BigNumbersProps) {

  return (

    <div className="grid grid-cols-5 gap-2 mb-4">

      {/* Card 1: Rank */}

      <Card className="bg-black border-zinc-800/50 shadow-lg overflow-hidden group">

        <CardContent className="p-3">

            <div className="flex items-center justify-between mb-1">

                <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-500">Universe Rank</span>

                <Award className="h-3 w-3 text-primary opacity-50" />

            </div>

            <div className="flex items-baseline gap-1">

                <span className="text-2xl font-mono font-black text-foreground tracking-tighter italic">#{rank}</span>

                <span className="text-[8px] text-zinc-600 font-mono">/ 37k</span>

            </div>

        </CardContent>

      </Card>

      

      {/* Card 2: Weight */}

      <Card className="bg-black border-primary/20 shadow-lg overflow-hidden group">

        <CardContent className="p-3">

            <div className="flex items-center justify-between mb-1">

                <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-500">Allocation</span>

                <Zap className="h-3 w-3 text-primary opacity-50" />

            </div>

            <div className="flex items-baseline gap-1">

                <span className="text-2xl font-mono font-black text-primary tracking-tighter italic">{weight}%</span>

                <span className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest font-bold">Target</span>

            </div>

        </CardContent>

      </Card>



      {/* Card 3: Factor Score */}

      <Card className="bg-black border-zinc-800/50 shadow-lg overflow-hidden group">

        <CardContent className="p-3">

            <div className="flex items-center justify-between mb-1">

                <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-500">Model Confidence</span>

                <TrendingUp className="h-3 w-3 text-primary opacity-50" />

            </div>

            <div className="flex items-baseline gap-1">

                <span className="text-2xl font-mono font-black text-foreground tracking-tighter italic">{score.toFixed(2)}</span>

            </div>

        </CardContent>

      </Card>



      {/* Card 4: Alpha State */}

      <Card className="bg-black border-zinc-800/50 shadow-lg overflow-hidden group">

        <CardContent className="p-3">

            <div className="flex items-center justify-between mb-1">

                <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-500">Alpha State</span>

                <ShieldCheck className="h-3 w-3 text-emerald-500 opacity-50" />

            </div>

            <div className="flex items-center gap-2 h-8">

                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black tracking-widest uppercase px-2 py-0">High Alpha</Badge>

            </div>

        </CardContent>

      </Card>



      {/* Card 5: System Status */}

      <Card className="bg-black border-zinc-800/50 shadow-lg overflow-hidden group">

        <CardContent className="p-3">

            <div className="flex items-center justify-between mb-1">

                <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-500">System Telemetry</span>

                <Activity className="h-3 w-3 text-primary animate-pulse" />

            </div>

            <div className="flex flex-col">

                <span className="text-[9px] font-mono text-primary font-bold tracking-tighter">SIGNAL STREAM ACTIVE</span>

                <span className="text-[7px] text-zinc-600 font-mono uppercase">Buffer: Verified</span>

            </div>

        </CardContent>

      </Card>

    </div>

  )

}
