"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ShieldCheck } from "lucide-react"

interface RiskGaugeProps {
  var95?: number; // Value at Risk (95%)
  portfolioValue?: number;
}

export function RiskGauge({ var95 = 0, portfolioValue = 100000 }: RiskGaugeProps) {
  // Calculate VaR %
  const varPercent = portfolioValue > 0 ? (var95 / portfolioValue) * 100 : 0;
  
  // Risk Levels
  const isSafe = varPercent < 1.5;
  const isWarning = varPercent >= 1.5 && varPercent < 3.0;
  const isCritical = varPercent >= 3.0;

  // Determine color and rotation for simple gauge
  const color = isSafe ? "text-emerald-500" : isWarning ? "text-yellow-500" : "text-rose-500";
  const statusText = isSafe ? "SAFE" : isWarning ? "ELEVATED" : "CRITICAL";
  
  // Simple CSS gauge rotation
  const rotation = Math.min(varPercent * 30, 180); // Scale percentage to degrees (approx)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
            Risk Monitor (VaR 95%)
            {isCritical ? <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" /> : <ShieldCheck className="h-5 w-5 text-emerald-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-6">
        <div className="relative w-40 h-20 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-muted rounded-t-full border-t border-l border-r border-border"></div>
            <div 
                className={`absolute top-0 left-0 w-full h-full rounded-t-full origin-bottom transition-transform duration-1000 ${isCritical ? "bg-rose-500" : isWarning ? "bg-yellow-500" : "bg-emerald-500"}`}
                style={{ transform: `rotate(${rotation - 180}deg)`, opacity: 0.3 }}
            ></div>
             <div 
                className="absolute bottom-0 left-1/2 w-1 h-full bg-foreground origin-bottom transition-transform duration-1000"
                style={{ transform: `rotate(${rotation - 90}deg)` }}
            ></div>
        </div>
        <div className="mt-4 text-center">
            <div className={`text-3xl font-mono font-bold ${color}`}>
                {varPercent.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">{statusText}</div>
            <div className="text-xs text-muted-foreground mt-1">-${var95.toFixed(2)} Potential Loss</div>
        </div>
      </CardContent>
    </Card>
  )
}
