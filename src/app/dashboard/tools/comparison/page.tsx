"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
    IconTrash, 
    IconRefresh,
    IconChartLine,
    IconSearch,
    IconTrendingUp,
    IconChartBar
} from "@tabler/icons-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { 
    createChart, 
    ColorType, 
    LineSeries, 
    Time,
    IChartApi,
    ISeriesApi
} from "lightweight-charts"
import { CompactGrid } from "@/components/market-hub/compact-grid"

const COLOR_PALETTE = [
    "#0ea5e9", // Sky
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#06b6d4", // Cyan
]

interface ComparisonResult {
    symbol: string
    price: number
    changesPercentage: number
    marketCap: number
    volume: number
    priceToEarningsRatio?: number
}

interface GraphHistoryPoint {
    date: string
    value: number
}

interface GraphData {
    [symbol: string]: {
        history: GraphHistoryPoint[]
        changesPercentage: number[]
    }
}

export default function ComparisonToolPage() {
    const [tickerList, setTickerList] = useState<string[]>(["NVDA", "AAPL"])
    const [inputValue, setInputValue] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [tableData, setTableData] = useState<ComparisonResult[]>([])
    const [graphData, setRawGraphData] = useState<GraphData>({})
    
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const seriesRef = useRef<ISeriesApi<"Line">[]>([])

    const fetchData = useCallback(async () => {
        if (tickerList.length === 0) return
        setIsLoading(true)
        try {
            const data = await api.getComparisonData(tickerList, { name: "Total Return [%]", value: "totalReturn" })
            setTableData(data.table)
            setRawGraphData(data.graph)
        } catch {
            toast.error("Failed to sync comparison data")
        } finally {
            setIsLoading(false)
        }
    }, [tickerList])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const addTicker = () => {
        const sym = inputValue.trim().toUpperCase()
        if (!sym) return
        if (tickerList.includes(sym)) {
            toast.error(`${sym} is already in the comparison`)
            return
        }
        setTickerList([...tickerList, sym])
        setInputValue("")
    }

    const removeTicker = (sym: string) => {
        setTickerList(tickerList.filter(t => t !== sym))
    }

    useEffect(() => {
        if (!chartContainerRef.current || Object.keys(graphData).length === 0) return

        if (chartRef.current) {
            chartRef.current.remove()
        }

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
                borderVisible: false,
            },
            rightPriceScale: {
                borderVisible: false,
            },
        })

        chartRef.current = chart
        seriesRef.current = []

        tickerList.forEach((symbol, i) => {
            const data = graphData[symbol]
            if (!data || !data.history) return

            const series = chart.addSeries(LineSeries, {
                color: COLOR_PALETTE[i % COLOR_PALETTE.length],
                lineWidth: 2,
                title: symbol,
            })

            // Normalize to % return since start of period
            const history = data.history
            if (history.length > 0) {
                const firstVal = history[0].value
                const normalized = history.map((p: GraphHistoryPoint) => ({
                    time: p.date as Time,
                    value: ((p.value - firstVal) / firstVal) * 100
                }))
                series.setData(normalized)
                seriesRef.current.push(series)
            }
        })

        chart.timeScale().fitContent()

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth })
        }
        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [graphData, tickerList])

    const columns = [
        { header: "Symbol", accessorKey: "symbol", className: "w-[100px]" },
        { 
            header: "Price", 
            accessorKey: "price",
            cell: (item: ComparisonResult) => <span className="font-mono text-xs font-bold">${item.price?.toFixed(2)}</span>
        },
        { 
            header: "Change", 
            accessorKey: "changesPercentage",
            cell: (item: ComparisonResult) => (
                <Badge variant="outline" className={cn(
                    "text-[10px] font-black border-none h-5",
                    item.changesPercentage >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                    {item.changesPercentage >= 0 ? "+" : ""}{item.changesPercentage?.toFixed(2)}%
                </Badge>
            )
        },
        { 
            header: "Market Cap", 
            accessorKey: "marketCap",
            cell: (item: ComparisonResult) => <span className="font-mono text-xs opacity-70">${(item.marketCap / 1e9).toFixed(2)}B</span>
        },
        { 
            header: "P/E Ratio", 
            accessorKey: "priceToEarningsRatio",
            cell: (item: ComparisonResult) => <span className="font-mono text-xs font-bold">{item.priceToEarningsRatio?.toFixed(1) || "---"}</span>
        },
    ]

    return (
        <div className="flex flex-col space-y-6 max-w-7xl mx-auto w-full pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconChartLine className="size-6 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">Stock Comparison Tool</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Normalized Performance & Fundamental Analysis
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input 
                            placeholder="Add Symbol..." 
                            className="h-9 pl-9 w-40 bg-muted/20 border-border/50 rounded-full text-[11px] font-bold uppercase tracking-widest focus-visible:ring-primary/20"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTicker()}
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50" onClick={fetchData}>
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Sync
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {tickerList.map((sym, i) => (
                    <Badge 
                        key={sym} 
                        className="h-7 px-3 flex items-center gap-2 border-none transition-all group"
                        style={{ backgroundColor: `${COLOR_PALETTE[i % COLOR_PALETTE.length]}20`, color: COLOR_PALETTE[i % COLOR_PALETTE.length] }}
                    >
                        <span className="font-black font-mono text-[11px]">{sym}</span>
                        <button onClick={() => removeTicker(sym)} className="opacity-50 hover:opacity-100 transition-opacity">
                            <IconTrash className="size-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12 space-y-6">
                    <Card className="border-border/50 bg-card/20 backdrop-blur-sm overflow-hidden h-[500px] flex flex-col">
                        <CardHeader className="py-3 border-b border-border/50 flex flex-row items-center justify-between shrink-0 bg-muted/20">
                            <div className="flex items-center gap-2">
                                <IconTrendingUp className="size-4 text-primary" />
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Return Performance (%)</CardTitle>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-mono">Normalized to Start of Period</Badge>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 relative">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                                    <IconRefresh className="size-8 animate-spin text-primary opacity-20" />
                                </div>
                            )}
                            <div ref={chartContainerRef} className="w-full h-full" />
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                            <IconChartBar className="size-3 text-muted-foreground" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comparative Fundamentals</span>
                        </div>
                        <CompactGrid 
                            data={tableData} 
                            columns={columns} 
                            isLoading={isLoading} 
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}