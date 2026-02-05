"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    IconPlus, 
    IconTrash, 
    IconTarget, 
    IconTrendingUp,
    IconTrendingDown,
    IconChartBar,
    IconCalculator
} from "@tabler/icons-react"
import { 
    OptionLeg, 
    calculatePayoff
} from "@/lib/options/math"
import { 
    createChart, 
    ColorType, 
    AreaSeries, 
    LineSeries,
    Time
} from "lightweight-charts"
import { useRef } from "react"
import { IChartApi } from "lightweight-charts"

const DEFAULT_STRATEGY: OptionLeg[] = [
    { action: 'Buy', optionType: 'Call', strike: 150, optionPrice: 5.50, quantity: 1, date: '2026-06-19' }
]

export default function OptionsCalculatorPage() {
    const [legs, setLegs] = useState<OptionLeg[]>(DEFAULT_STRATEGY)
    const [underlyingPrice, setUnderlyingPrice] = useState(145.00)
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)

    const addLeg = () => {
        const lastLeg = legs[legs.length - 1]
        setLegs([...legs, { ...lastLeg }])
    }

    const removeLeg = (index: number) => {
        if (legs.length > 1) {
            setLegs(legs.filter((_, i) => i !== index))
        }
    }

    const updateLeg = (index: number, updates: Partial<OptionLeg>) => {
        const newLegs = [...legs]
        newLegs[index] = { ...newLegs[index], ...updates }
        setLegs(newLegs)
    }

    const { dataPoints, maxProfit, maxLoss, breakeven } = useMemo(() => {
        const points = []
        const minStrike = Math.min(...legs.map(l => l.strike))
        const maxStrike = Math.max(...legs.map(l => l.strike))
        const start = Math.max(0, minStrike * 0.5)
        const end = maxStrike * 1.5
        const step = (end - start) / 100

        let computedMaxProfit = -Infinity
        let computedMaxLoss = Infinity
        let bePoint = null

        for (let s = start; s <= end; s += step) {
            const payoff = calculatePayoff(legs, s)
            points.push({ time: s as unknown as Time, value: payoff })
            
            if (payoff > computedMaxProfit) computedMaxProfit = payoff
            if (payoff < computedMaxLoss) computedMaxLoss = payoff
        }

        // Simple breakeven detection
        for (let i = 1; i < points.length; i++) {
            if ((points[i-1].value < 0 && points[i].value >= 0) || (points[i-1].value > 0 && points[i].value <= 0)) {
                bePoint = points[i].time
                break
            }
        }

        return { 
            dataPoints: points, 
            maxProfit: computedMaxProfit, 
            maxLoss: computedMaxLoss,
            breakeven: bePoint
        }
    }, [legs])

    useEffect(() => {
        if (!chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#94a3b8",
                fontFamily: "var(--font-jetbrains-mono)",
            },
            grid: {
                vertLines: { color: "rgba(148, 163, 184, 0.05)" },
                horzLines: { color: "rgba(148, 163, 184, 0.05)" },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                visible: true,
                borderVisible: false,
            },
            rightPriceScale: {
                borderVisible: false,
            },
            crosshair: {
                mode: 0,
            }
        })

        const series = chart.addSeries(AreaSeries, {
            lineColor: "#0ea5e9",
            topColor: "rgba(14, 165, 233, 0.3)",
            bottomColor: "rgba(14, 165, 233, 0)",
            lineWidth: 2,
        })

        // Add custom zones for profit/loss colors if possible, 
        // but lightweight-charts requires a plugin or multiple series for this.
        // For simplicity, we'll use a single color for now.
        
        series.setData(dataPoints as unknown as { time: Time; value: number }[])
        chart.timeScale().fitContent()

        // Current Price Line
        const priceLine = chart.addSeries(LineSeries, {
            color: '#94a3b8',
            lineWidth: 1,
            lineStyle: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        })
        priceLine.setData([
            { time: underlyingPrice as unknown as Time, value: maxLoss * 1.2 },
            { time: underlyingPrice as unknown as Time, value: maxProfit * 1.2 }
        ] as { time: Time; value: number }[])

        chartRef.current = chart

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth })
        }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [dataPoints, underlyingPrice, maxProfit, maxLoss])

    return (
        <div className="flex flex-col space-y-6 max-w-7xl mx-auto w-full pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconCalculator className="size-6 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Options Strategy Builder</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        P/L Analysis • Greeks • Risk Modeling
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-muted/30 px-4 py-2 rounded-xl border border-border/50">
                        <span className="text-[10px] font-black uppercase text-muted-foreground block mb-0.5">Spot Price</span>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-black font-mono">${underlyingPrice.toFixed(2)}</span>
                            <Input 
                                type="number" 
                                className="w-20 h-6 text-xs bg-transparent border-none p-0 focus-visible:ring-0 font-bold text-primary"
                                value={underlyingPrice}
                                onChange={(e) => setUnderlyingPrice(Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CONFIGURATION PANEL */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border-border/50 bg-card/20 backdrop-blur-sm">
                        <CardHeader className="py-3 border-b border-border/50 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Strategy Legs</CardTitle>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={addLeg}>
                                <IconPlus className="size-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {legs.map((leg, i) => (
                                <div key={i} className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-3 relative group">
                                    <button 
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        onClick={() => removeLeg(i)}
                                    >
                                        <IconTrash className="size-3.5" />
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase text-muted-foreground ml-1">Type</span>
                                            <div className="flex gap-1">
                                                <Button 
                                                    size="sm" 
                                                    variant={leg.action === 'Buy' ? 'default' : 'outline'}
                                                    className="h-7 text-[9px] font-black uppercase flex-1"
                                                    onClick={() => updateLeg(i, { action: 'Buy' })}
                                                >Buy</Button>
                                                <Button 
                                                    size="sm" 
                                                    variant={leg.action === 'Sell' ? 'destructive' : 'outline'}
                                                    className="h-7 text-[9px] font-black uppercase flex-1"
                                                    onClick={() => updateLeg(i, { action: 'Sell' })}
                                                >Sell</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase text-muted-foreground ml-1">Option</span>
                                            <div className="flex gap-1">
                                                <Button 
                                                    size="sm" 
                                                    variant={leg.optionType === 'Call' ? 'secondary' : 'outline'}
                                                    className="h-7 text-[9px] font-black uppercase flex-1"
                                                    onClick={() => updateLeg(i, { optionType: 'Call' })}
                                                >Call</Button>
                                                <Button 
                                                    size="sm" 
                                                    variant={leg.optionType === 'Put' ? 'secondary' : 'outline'}
                                                    className="h-7 text-[9px] font-black uppercase flex-1"
                                                    onClick={() => updateLeg(i, { optionType: 'Put' })}
                                                >Put</Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase text-muted-foreground ml-1">Strike</span>
                                            <Input 
                                                type="number" 
                                                className="h-8 text-xs font-bold font-mono"
                                                value={leg.strike}
                                                onChange={(e) => updateLeg(i, { strike: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase text-muted-foreground ml-1">Price (Premium)</span>
                                            <Input 
                                                type="number" 
                                                className="h-8 text-xs font-bold font-mono"
                                                value={leg.optionPrice}
                                                onChange={(e) => updateLeg(i, { optionPrice: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-card/20 backdrop-blur-sm">
                        <CardHeader className="py-3 border-b border-border/50">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Risk Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-center border-b border-border/20 pb-2">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">Max Profit</span>
                                <span className="text-sm font-black font-mono text-green-500">${maxProfit.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-border/20 pb-2">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">Max Loss</span>
                                <span className="text-sm font-black font-mono text-red-500">${Math.abs(maxLoss).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">Breakeven</span>
                                <span className="text-sm font-black font-mono">${Number(breakeven || 0).toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ANALYSIS PANEL */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="border-border/50 bg-card/20 backdrop-blur-sm overflow-hidden h-[500px] flex flex-col">
                        <CardHeader className="py-3 border-b border-border/50 flex flex-row items-center justify-between shrink-0">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <IconChartBar className="size-4" /> Payoff Diagram
                            </CardTitle>
                            <Badge variant="outline" className="text-[9px] font-mono">Expiration: Jun 19, 2026</Badge>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 relative">
                            <div ref={chartContainerRef} className="w-full h-full" />
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Delta", value: "0.45", icon: <IconTarget className="size-3" /> },
                            { label: "Gamma", value: "0.012", icon: <IconPlus className="size-3" /> },
                            { label: "Theta", value: "-$12.40", icon: <IconTrendingDown className="size-3" /> },
                            { label: "Vega", value: "$4.50", icon: <IconTrendingUp className="size-3" /> },
                        ].map((greek, i) => (
                            <Card key={i} className="border-border/50 bg-card/20 backdrop-blur-sm p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    {greek.icon}
                                    <span className="text-[9px] font-black uppercase text-muted-foreground">{greek.label}</span>
                                </div>
                                <div className="text-lg font-black font-mono">{greek.value}</div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
