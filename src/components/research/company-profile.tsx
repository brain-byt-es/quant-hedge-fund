"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, Users, DollarSign } from "lucide-react"

interface ProfileData {
  company_name: string;
  sector: string;
  industry: string;
  price: number;
  exchange: string;
  market_cap: number;
  full_time_employees: number;
  beta: number;
  ipo_date: string;
  description: string;
  website: string;
  [key: string]: unknown;
}

export function CompanyProfile({ profile }: { profile: ProfileData | null }) {
  if (!profile) return (
    <Card className="h-full border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md flex items-center justify-center p-8 border-dashed">
        <div className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse">Awaiting Selection...</div>
    </Card>
  )

  return (
    <Card className="h-full border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/30">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white tracking-tight leading-none italic">
                        {profile.company_name}
                    </h2>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] h-3.5 px-1.5 border-zinc-700 bg-zinc-950 text-zinc-500 font-mono uppercase">{profile.symbol}</Badge>
                        <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                            {profile.sector} // {profile.industry}
                        </span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-tighter mb-1">Quote</span>
                    <div className="text-2xl font-mono font-black text-emerald-400 leading-none tracking-tighter">
                        ${profile.price.toFixed(2)}
                    </div>
                    <span className="text-[8px] text-zinc-500 font-mono uppercase mt-1 bg-zinc-900 px-1 rounded border border-zinc-800">
                        {profile.exchange}
                    </span>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1 group">
                    <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest block group-hover:text-zinc-400 transition-colors">Market Cap</span>
                    <div className="text-xs font-mono text-zinc-200 flex items-center gap-1.5 bg-black/20 p-1.5 rounded border border-transparent group-hover:border-zinc-800 transition-all">
                        <DollarSign className="h-3 w-3 text-emerald-500/50" />
                        {(profile.market_cap / 1e9).toFixed(2)}B
                    </div>
                </div>
                <div className="space-y-1 group">
                    <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest block group-hover:text-zinc-400 transition-colors">Employees</span>
                    <div className="text-xs font-mono text-zinc-200 flex items-center gap-1.5 bg-black/20 p-1.5 rounded border border-transparent group-hover:border-zinc-800 transition-all">
                        <Users className="h-3 w-3 text-blue-500/50" />
                        {profile.full_time_employees?.toLocaleString()}
                    </div>
                </div>
                <div className="space-y-1 group">
                    <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest block group-hover:text-zinc-400 transition-colors">Beta (Vol)</span>
                    <div className="text-xs font-mono text-zinc-200 bg-black/20 p-1.5 rounded border border-transparent group-hover:border-zinc-800 transition-all">
                        {profile.beta}
                    </div>
                </div>
                <div className="space-y-1 group">
                    <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest block group-hover:text-zinc-400 transition-colors">IPO Date</span>
                    <div className="text-xs font-mono text-zinc-200 bg-black/20 p-1.5 rounded border border-transparent group-hover:border-zinc-800 transition-all">
                        {profile.ipo_date}
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2 border-t border-zinc-800/50 pt-4">
                <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-[0.2em] block">Full Narrative</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-serif italic opacity-80">
                    {profile.description}
                </p>
            </div>
            
            {/* Footer Link */}
            {profile.website && (
                <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                    <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-blue-400 hover:text-blue-300 font-bold transition-colors">
                        <Globe className="h-3 w-3" /> Connect to Entity
                    </a>
                    <span className="text-[8px] text-zinc-700 font-mono uppercase tracking-widest">Auth: Institutional</span>
                </div>
            )}
        </div>
    </Card>
  )
}
