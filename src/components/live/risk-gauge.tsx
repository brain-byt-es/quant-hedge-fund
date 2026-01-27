"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function RiskGauge({ var95, portfolioValue }: { var95?: number, portfolioValue?: number }) {
  // Mock calculate percentage
  const varValue = var95 || 4500;
  const total = portfolioValue || 100000;
  const riskPct = (varValue / total) * 100;
  
  // Angle for gauge (0 to 180 degrees)
  // Max risk e.g. 10%
  const maxRisk = 10;
  const angle = Math.min((riskPct / maxRisk) * 180, 180);

  return (
    <Card className="h-full border-zinc-800 bg-zinc-950 flex flex-col">
        <CardHeader className="py-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Risk (95% VaR)</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative p-4">
            <div className="relative w-40 h-20 overflow-hidden mb-2">
                {/* Background Arc */}
                <div className="absolute w-40 h-40 rounded-full border-[12px] border-zinc-900 top-0 left-0 box-border border-b-0 border-l-0 border-r-0" 
                     style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)', borderRadius: '50%' }}
                />
                
                {/* Value Arc (CSS rotation hack) */}
                {/* Simplified: Just use a needle */}
                <div className="absolute bottom-0 left-1/2 w-1 h-20 bg-zinc-800 origin-bottom transform -translate-x-1/2" 
                     style={{ transform: `translateX(-50%) rotate(${angle - 90}deg)` }}
                >
                    <div className="w-2 h-2 bg-red-500 rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_10px_red]" />
                </div>
            </div>
            
            <div className="text-center mt-[-10px]">
                <div className="text-2xl font-mono font-bold text-zinc-200">
                    ${varValue.toLocaleString()}
                </div>
                <div className="text-xs text-zinc-600 font-mono">
                    {riskPct.toFixed(2)}% of Equity
                </div>
            </div>
        </CardContent>
    </Card>
  )
}