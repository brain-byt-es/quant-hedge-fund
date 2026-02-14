"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ShieldCheck } from "lucide-react"

export function RiskGauge({ 
    var95, 
    portfolioValue, 
    dynamicLimit,
    dailyPnL = 0 
}: { 
    var95?: number, 
    portfolioValue?: number,
    dynamicLimit?: number,
    dailyPnL?: number
}) {

  const varValue = var95 || 0;
  const total = portfolioValue || 1;
  const riskPct = (varValue / total) * 100;
  const limit = dynamicLimit || 5000;

  // Calculate current stress level (PnL vs Dynamic Limit)
  const stressLevel = Math.min(Math.abs(dailyPnL) / limit, 1.2);
  const isBreached = Math.abs(dailyPnL) >= limit && dailyPnL < 0;

  // Gauge Angle (0 to 180) - representing 0 to 120% of risk budget
  const angle = Math.min((stressLevel / 1.0) * 180, 180);

  return (
    <Card className={`h-full border-border bg-card flex flex-col transition-colors duration-500 ${isBreached ? 'bg-destructive/10 border-destructive' : ''}`}>
        <CardHeader className="py-3 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Risk Engine V2
            </CardTitle>
            {isBreached ? (
                <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
            ) : (
                <ShieldCheck className="w-4 h-4 text-primary" />
            )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative p-4">
            <div className="relative w-40 h-20 overflow-hidden mb-2">
                {/* Dynamic Risk Arc */}
                <div className="absolute w-40 h-40 rounded-full border-[12px] border-muted top-0 left-0 box-border border-b-0 border-l-0 border-r-0" 
                     style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)', borderRadius: '50%' }}
                />
                
                {/* Warning Zone (Last 20% of budget) */}
                <div className="absolute w-40 h-40 rounded-full border-[12px] border-destructive/30 top-0 left-0 box-border border-b-0 border-l-0 border-r-0" 
                     style={{ 
                        clipPath: 'polygon(80% 0, 100% 0, 100% 50%, 80% 50%)', 
                        borderRadius: '50%',
                        transform: 'rotate(0deg)'
                     }}
                />

                {/* Value Needle */}
                <div className="absolute bottom-0 left-1/2 w-1 h-20 bg-foreground origin-bottom transition-transform duration-1000 ease-out" 
                     style={{ transform: `translateX(-50%) rotate(${angle - 90}deg)` }}
                >
                    <div className={`w-2 h-2 rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-lg ${isBreached ? 'bg-destructive' : 'bg-primary'}`} />
                </div>
            </div>
            
            <div className="text-center mt-[-10px]">
                <div className={`text-2xl font-mono font-bold ${isBreached ? 'text-destructive' : 'text-foreground'}`}>
                    ${Math.abs(dailyPnL).toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
                    vs. ${limit.toLocaleString()} Dynamic Stop
                </div>
                <div className="mt-2 text-[10px] font-mono bg-muted px-2 py-0.5 rounded-full inline-block">
                    {riskPct.toFixed(2)}% VaR (95)
                </div>
            </div>
        </CardContent>
    </Card>
  )
}
