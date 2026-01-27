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
  if (!profile) return <div className="text-xs text-zinc-600 italic">Select a symbol...</div>

  return (
    <Card className="h-full border-zinc-800 bg-zinc-950 flex flex-col overflow-y-auto">
        <CardHeader className="py-2 border-b border-zinc-800 bg-zinc-900/30">
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                        {profile.company_name}
                    </CardTitle>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">
                        {profile.sector} • {profile.industry}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-mono font-bold text-emerald-500">${profile.price}</div>
                    <Badge variant="outline" className="text-[9px] h-4 border-zinc-700 text-zinc-400">{profile.exchange}</Badge>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <span className="text-[10px] text-zinc-600 uppercase">Market Cap</span>
                    <div className="text-xs font-mono text-zinc-300 flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-zinc-500" />
                        {(profile.market_cap / 1e9).toFixed(2)}B
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-[10px] text-zinc-600 uppercase">Employees</span>
                    <div className="text-xs font-mono text-zinc-300 flex items-center gap-1">
                        <Users className="h-3 w-3 text-zinc-500" />
                        {profile.full_time_employees?.toLocaleString()}
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-[10px] text-zinc-600 uppercase">Beta</span>
                    <div className="text-xs font-mono text-zinc-300">
                        {profile.beta}
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-[10px] text-zinc-600 uppercase">IPO Date</span>
                    <div className="text-xs font-mono text-zinc-300">
                        {profile.ipo_date}
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="pt-2 border-t border-zinc-800">
                <span className="text-[10px] text-zinc-600 uppercase block mb-1">Description</span>
                <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-6">
                    {profile.description}
                </p>
            </div>
            
            {/* Footer Link */}
            {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline">
                    <Globe className="h-3 w-3" /> Website
                </a>
            )}
        </CardContent>
    </Card>
  )
}
