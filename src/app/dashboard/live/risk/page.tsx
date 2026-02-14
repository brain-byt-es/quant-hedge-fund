"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ShieldAlert, TrendingDown, Target, PieChart, Activity, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
    ResponsiveContainer, 
    PieChart as RePieChart, 
    Pie, 
    Cell, 
    Tooltip as ReTooltip
} from "recharts"

interface RiskProfile {
    summary: {
        var_95_usd: number
        var_95_percent: number
        expected_shortfall_usd: number
        total_equity: number
    }
    exposure: {
        long_exposure_usd: number
        short_exposure_usd: number
        gross_exposure_usd: number
        net_exposure_usd: number
        net_leverage: number
        gross_leverage: number
    }
    concentration: {
        sectors: { name: string, value: number, weight: number }[]
    }
    stress_tests: {
        scenario: string
        impact_usd: number
        impact_percent: number
        status: string
    }[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function RiskControlPage() {
    const [risk, setRisk] = useState<RiskProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRisk = async () => {
            try {
                // We'll use the new /api/live/risk endpoint
                const res = await fetch("/api/live/risk");
                if (res.ok) {
                    const data = await res.json();
                    setRisk(data);
                }
            } catch (err) {
                console.error("Risk Engine: Connection refused or backend busy...");
            } finally {
                setLoading(false);
            }
        };

        fetchRisk();
        const interval = setInterval(fetchRisk, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center animate-pulse font-mono text-xs uppercase tracking-widest text-muted-foreground">Initializing Risk Neural Network...</div>;

    return (
        <div className="flex flex-col gap-4 p-4 h-full bg-background text-foreground font-sans overflow-auto">
            {/* Header */}
            <div className="flex flex-col gap-1 px-1">
                <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    Risk Control <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">V2 ACTIVE</Badge>
                </h1>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest text-primary/70">Portfolio Safety // VaR 95% // Exposure Guards</p>
            </div>

            {/* Top Row: KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border bg-card/50 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <ShieldAlert className="h-3 w-3 text-primary" /> Value at Risk (95%)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-black font-mono">
                            ${risk?.summary.var_95_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            EST. MAX DAILY LOSS: <span className="text-destructive font-bold">{(risk?.summary.var_95_percent ? risk.summary.var_95_percent * 100 : 0).toFixed(2)}%</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card/50 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <Target className="h-3 w-3 text-chart-2" /> Net Exposure
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-black font-mono">
                            ${risk?.exposure.net_exposure_usd.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] h-4">LEVERAGE: {risk?.exposure.net_leverage.toFixed(2)}x</Badge>
                            {risk?.exposure.net_exposure_usd && risk.exposure.net_exposure_usd > 0 ? 
                                <span className="text-[10px] text-emerald-500 flex items-center gap-0.5 font-bold"><ArrowUpRight className="h-3 w-3" /> LONG</span> :
                                <span className="text-[10px] text-destructive flex items-center gap-0.5 font-bold"><ArrowDownRight className="h-3 w-3" /> SHORT</span>
                            }
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card/50 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <Activity className="h-3 w-3 text-chart-4" /> Expected Shortfall
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-black font-mono">
                            ${risk?.summary.expected_shortfall_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase">Tail Risk Projection (ES)</p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card/50 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <TrendingDown className="h-3 w-3 text-primary" /> Drawdown Threshold
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-black font-mono text-primary">
                            $5,000.00
                        </div>
                        <Progress value={30} className="h-1 mt-2 bg-muted" />
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase">Daily Circuit Breaker</p>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row: Charts & Stress Tests */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
                
                {/* Concentration Chart (5 Cols) */}
                <Card className="lg:col-span-5 border-border bg-card/30 flex flex-col overflow-hidden">
                    <CardHeader className="p-4 border-b border-border bg-muted/20">
                        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <PieChart className="h-4 w-4" /> Sector Concentration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 min-h-[300px] flex flex-col items-center justify-center">
                        {risk && risk.concentration.sectors.length > 0 ? (
                            <>
                                <div className="flex-1 w-full min-h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie
                                                data={risk.concentration.sectors}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {risk.concentration.sectors.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <ReTooltip 
                                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '10px' }}
                                                formatter={(value: number) => `$${value.toLocaleString()}`}
                                            />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                                    {risk.concentration.sectors.slice(0, 4).map((s, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="text-muted-foreground truncate">{s.name}:</span>
                                            <span className="font-bold">{(s.weight * 100).toFixed(1)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 opacity-20 py-12">
                                <PieChart className="h-12 w-12" />
                                <p className="text-[10px] font-mono uppercase tracking-widest">No Active Positions</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Stress Test Matrix (7 Cols) */}
                <Card className="lg:col-span-7 border-border bg-card/30 flex flex-col overflow-hidden">
                    <CardHeader className="p-4 border-b border-border bg-muted/20">
                        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> &apos;What-If&apos; Stress Scenarios
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 min-h-[300px]">
                        {risk && risk.summary.total_equity > 0 ? (
                            <ScrollArea className="h-[300px]">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b border-border z-10">
                                        <tr className="text-[10px] uppercase text-muted-foreground font-bold">
                                            <th className="px-4 py-3">Scenario</th>
                                            <th className="px-4 py-3 text-right">Proj. Impact ($)</th>
                                            <th className="px-4 py-3 text-right">Proj. Impact (%)</th>
                                            <th className="px-4 py-3 text-center">Severity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {risk.stress_tests.map((s, i) => (
                                            <tr key={i} className="hover:bg-accent/5 transition-colors">
                                                <td className="px-4 py-3 text-[11px] font-bold text-foreground/90">{s.scenario}</td>
                                                <td className="px-4 py-3 text-[11px] font-mono text-right text-destructive">
                                                    -${Math.abs(s.impact_usd).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-[11px] font-mono text-right text-destructive">
                                                    -{(Math.abs(s.impact_percent) * 100).toFixed(2)}%
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge className={cn(
                                                        "text-[8px] uppercase px-1.5 h-4",
                                                        s.status === "SEVERE" ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-amber-500/20 text-amber-500 border-amber-500/30"
                                                    )}>
                                                        {s.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-20 py-12">
                                <ShieldAlert className="h-12 w-12" />
                                <p className="text-[10px] font-mono uppercase tracking-widest">Awaiting Portfolio Data</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
