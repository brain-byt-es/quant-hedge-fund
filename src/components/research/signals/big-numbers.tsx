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



    <div className="grid grid-cols-5 gap-3 mb-5">



      {/* Card 1: Rank */}



      <Card className="bg-card/50 border-border backdrop-blur-sm shadow-xl overflow-hidden group">



        <CardContent className="p-4">



            <div className="flex items-center justify-between mb-2">



                <span className="text-xs uppercase tracking-widest font-black text-muted-foreground">Universe Rank</span>



                <Award className="h-4 w-4 text-primary opacity-70" />



            </div>



            <div className="flex items-baseline gap-1.5">



                <span className="text-3xl font-mono font-black text-foreground tracking-tighter italic">#{rank}</span>



                <span className="text-xs text-muted-foreground font-mono font-bold">/ 37k</span>



            </div>



        </CardContent>



      </Card>



      



      {/* Card 2: Weight */}



      <Card className="bg-primary/5 border-primary/20 shadow-xl overflow-hidden group">



        <CardContent className="p-4">



            <div className="flex items-center justify-between mb-2">



                <span className="text-xs uppercase tracking-widest font-black text-muted-foreground">Allocation</span>



                <Zap className="h-4 w-4 text-primary opacity-70" />



            </div>



            <div className="flex items-baseline gap-1.5">



                <span className="text-3xl font-mono font-black text-primary tracking-tighter italic">{weight}%</span>



                <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest font-black opacity-60">Target</span>



            </div>



        </CardContent>



      </Card>







      {/* Card 3: Factor Score */}



      <Card className="bg-card/50 border-border backdrop-blur-sm shadow-xl overflow-hidden group">



        <CardContent className="p-4">



            <div className="flex items-center justify-between mb-2">



                <span className="text-xs uppercase tracking-widest font-black text-muted-foreground">Model Confidence</span>



                <TrendingUp className="h-4 w-4 text-primary opacity-70" />



            </div>



            <div className="flex items-baseline gap-1.5">



                <span className="text-3xl font-mono font-black text-foreground tracking-tighter italic">{score.toFixed(2)}</span>



            </div>



        </CardContent>



      </Card>







      {/* Card 4: Alpha State */}



      <Card className="bg-card/50 border-border backdrop-blur-sm shadow-xl overflow-hidden group">



        <CardContent className="p-4">



            <div className="flex items-center justify-between mb-2">



                <span className="text-xs uppercase tracking-widest font-black text-muted-foreground">Alpha State</span>



                <ShieldCheck className="h-4 w-4 text-primary opacity-70" />



            </div>



            <div className="flex items-center gap-2 h-9">



                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black tracking-widest uppercase px-3 py-0.5 h-6">High Alpha</Badge>



            </div>



        </CardContent>



      </Card>







      {/* Card 5: System Status */}



      <Card className="bg-card/50 border-border backdrop-blur-sm shadow-xl overflow-hidden group">



        <CardContent className="p-4">



            <div className="flex items-center justify-between mb-2">



                <span className="text-xs uppercase tracking-widest font-black text-muted-foreground">System Telemetry</span>



                <Activity className="h-4 w-4 text-primary animate-pulse" />



            </div>



            <div className="flex flex-col gap-0.5">



                <span className="text-[11px] font-mono text-primary font-black tracking-tighter uppercase">Signal Stream Active</span>



                <span className="text-[9px] text-muted-foreground font-mono uppercase font-bold tracking-widest">Buffer: Verified</span>



            </div>



        </CardContent>



      </Card>



    </div>



  )



}




