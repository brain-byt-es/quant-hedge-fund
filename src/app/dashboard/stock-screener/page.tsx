"use client"

import { useState, useEffect, useCallback } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
    IconFilter, 
    IconSettings2,
    IconRefresh,
    IconBolt
} from "@tabler/icons-react"
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ScreenerResult {
    symbol: string
    price: number
    change_percent: number
    volume: number
    avg_volume: number
    relative_volume: number
    gap_percent: number
    market_cap: number
    sector: string
    float_shares: number
}

// Warrior Trading Style Presets
const PRESETS = {
    "default": { name: "Select Preset...", filters: {} },
    "gap_go": { 
        name: "Gap & Go (Warrior)", 
        filters: { min_gap_percent: 2.0, min_relative_volume: 1.5, min_volume: 50000, min_price: 1.0 } 
    },
    "dip_buy": { 
        name: "Dip Buy Reversal", 
        filters: { max_gap_percent: -5.0, min_relative_volume: 2.0, min_price: 2.0 } 
    },
    "momentum": { 
        name: "High Momentum Day", 
        filters: { min_relative_volume: 3.0, min_price: 2.0, min_volume: 100000 } 
    },
    "small_cap": { 
        name: "Small Cap Runners", 
        filters: { min_price: 0.5, max_price: 20.0, min_gap_percent: 5.0, min_relative_volume: 1.0 } 
    },
    "large_cap": { 
        name: "Large Cap Movers", 
        filters: { min_price: 50.0, min_relative_volume: 1.2, min_market_cap: 10000000000 } 
    }
}

export default function StockScreenerPage() {
  const [data, setData] = useState<ScreenerResult[]>([])
  const [loading, setLoading] = useState(false)
  
  // Filters State
  const [filters, setFilters] = useState({
      min_price: 0,
      max_price: 1000,
      min_volume: 0,
      min_relative_volume: 0,
      min_gap_percent: -100,
      max_gap_percent: 100,
  })
  
  const [selectedPreset, setSelectedPreset] = useState("default")

  const fetchScreener = useCallback(async (activeFilters = filters) => {
    setLoading(true)
    try {
        const payload: Record<string, string | number> = { limit: 100 }
        if (activeFilters.min_price > 0) payload.min_price = activeFilters.min_price
        if (activeFilters.max_price < 1000) payload.max_price = activeFilters.max_price
        if (activeFilters.min_volume > 0) payload.min_volume = activeFilters.min_volume
        if (activeFilters.min_relative_volume > 0) payload.min_relative_volume = activeFilters.min_relative_volume
        if (activeFilters.min_gap_percent > -100) payload.min_gap_percent = activeFilters.min_gap_percent
        if (activeFilters.max_gap_percent < 100) payload.max_gap_percent = activeFilters.max_gap_percent
        
        const res = await api.scanMarket(payload)
        setData(res || [])
    } catch (err: unknown) {
        console.error(err)
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(`Failed: ${msg}`)
    } finally {
        setLoading(false)
    }
  }, [filters])

  // Initial Load
  useEffect(() => {
    fetchScreener()
  }, [fetchScreener])

  const applyPreset = (presetKey: string) => {
      setSelectedPreset(presetKey)
      const preset = PRESETS[presetKey as keyof typeof PRESETS]
      if (preset && presetKey !== "default") {
          const mergedFilters = {
              ...filters,
              min_price: 0, max_price: 1000, min_volume: 0, min_relative_volume: 0, 
              min_gap_percent: -100, max_gap_percent: 100,
              ...preset.filters
          }
          setFilters(mergedFilters)
          // Trigger fetch immediately
          fetchScreener(mergedFilters)
          toast.success(`Applied preset: ${preset.name}`)
      }
  }

  const formatLarge = (num: number) => {
    if (!num) return "-"
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B"
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M"
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K"
    return num.toLocaleString()
  }

  const columns = [
    { 
        header: "Symbol", 
        accessorKey: "symbol", 
        className: "w-[100px] font-bold text-primary", 
        sortable: true 
    },
    { 
        header: "Price", 
        accessorKey: "price",
        cell: (item: ScreenerResult) => <span className="font-mono text-sm font-bold">${item.price?.toFixed(2)}</span>,
        sortable: true
    },
    { 
        header: "Gap %", 
        accessorKey: "gap_percent",
        cell: (item: ScreenerResult) => (
            <Badge variant="outline" className={cn(
                "h-5 text-[10px] font-black border-none w-16 justify-center",
                item.gap_percent >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            )}>
                {item.gap_percent > 0 ? "+" : ""}{item.gap_percent?.toFixed(2)}%
            </Badge>
        ),
        sortable: true
    },
    { 
        header: "Change %", 
        accessorKey: "change_percent",
        cell: (item: ScreenerResult) => (
            <span className={cn(
                "font-mono text-xs font-bold",
                item.change_percent >= 0 ? "text-green-500" : "text-red-500"
            )}>
                {item.change_percent > 0 ? "+" : ""}{item.change_percent?.toFixed(2)}%
            </span>
        ),
        sortable: true
    },
    { 
        header: "Rel Vol", 
        accessorKey: "relative_volume",
        cell: (item: ScreenerResult) => (
            <div className="flex items-center gap-1">
                <span className={cn(
                    "font-mono text-xs font-black",
                    item.relative_volume >= 2.0 ? "text-amber-500" : "text-muted-foreground"
                )}>
                    {item.relative_volume?.toFixed(2)}x
                </span>
                {item.relative_volume >= 5.0 && <IconBolt className="h-3 w-3 text-amber-500 fill-amber-500 animate-pulse" />}
            </div>
        ),
        sortable: true
    },
    { 
        header: "Volume", 
        accessorKey: "volume",
        cell: (item: ScreenerResult) => <span className="font-mono text-xs opacity-70">{formatLarge(item.volume)}</span>,
        sortable: true
    },
    { 
        header: "Sector", 
        accessorKey: "sector",
        className: "hidden md:table-cell text-[10px] text-muted-foreground uppercase font-medium truncate max-w-[150px]" 
    },
  ]

  return (
    <div className="flex flex-col h-full space-y-4 p-4 md:p-6 bg-background/50">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-2">
            <IconFilter className="h-6 w-6 text-primary" /> 
            Pro Screener
            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full tracking-widest font-bold">LIVE</span>
          </h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">
            Real-time scanner with Warrior Trading metrics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
            <Button 
                size="sm" 
                variant="outline" 
                className="h-9 text-[10px] font-black uppercase tracking-widest gap-2"
                onClick={() => fetchScreener()}
                disabled={loading}
            >
                <IconRefresh className={cn("h-3 w-3", loading && "animate-spin")} />
                Refresh
            </Button>
            
            <Sheet>
                <SheetTrigger asChild>
                    <Button size="sm" className="h-9 text-[10px] font-black uppercase tracking-widest gap-2">
                        <IconSettings2 className="h-3 w-3" /> Filters
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px]">
                    <SheetHeader>
                        <SheetTitle className="uppercase font-black tracking-tighter">Scanner Config</SheetTitle>
                        <SheetDescription>Adjust your scanner parameters below.</SheetDescription>
                    </SheetHeader>
                    
                    <div className="grid gap-6 py-6">
                        {/* Price Range */}
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Price Range</Label>
                                <span className="text-xs font-mono">${filters.min_price} - ${filters.max_price}</span>
                            </div>
                            <div className="flex gap-4 items-center">
                                <Input 
                                    type="number" 
                                    className="h-8 font-mono text-xs" 
                                    value={filters.min_price} 
                                    onChange={e => setFilters({...filters, min_price: Number(e.target.value)})} 
                                />
                                <span className="text-muted-foreground">-</span>
                                <Input 
                                    type="number" 
                                    className="h-8 font-mono text-xs" 
                                    value={filters.max_price} 
                                    onChange={e => setFilters({...filters, max_price: Number(e.target.value)})} 
                                />
                            </div>
                        </div>

                        {/* Gap % */}
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Gap %</Label>
                                <span className="text-xs font-mono">{filters.min_gap_percent}% to {filters.max_gap_percent}%</span>
                            </div>
                            <div className="flex gap-4 items-center">
                                <Input 
                                    type="number" 
                                    className="h-8 font-mono text-xs" 
                                    value={filters.min_gap_percent} 
                                    onChange={e => setFilters({...filters, min_gap_percent: Number(e.target.value)})} 
                                />
                                <span className="text-muted-foreground">-</span>
                                <Input 
                                    type="number" 
                                    className="h-8 font-mono text-xs" 
                                    value={filters.max_gap_percent} 
                                    onChange={e => setFilters({...filters, max_gap_percent: Number(e.target.value)})} 
                                />
                            </div>
                        </div>

                        {/* Relative Volume */}
                        <div className="space-y-2">
                             <div className="flex justify-between">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Min Relative Vol</Label>
                                <span className="text-xs font-mono">{filters.min_relative_volume}x</span>
                            </div>
                            <Slider 
                                defaultValue={[filters.min_relative_volume]} 
                                max={10} 
                                step={0.5} 
                                onValueChange={(vals) => setFilters({...filters, min_relative_volume: vals[0]})}
                            />
                        </div>

                        {/* Min Volume */}
                        <div className="space-y-2">
                             <div className="flex justify-between">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Min Volume</Label>
                                <span className="text-xs font-mono">{formatLarge(filters.min_volume)}</span>
                            </div>
                            <Slider 
                                defaultValue={[filters.min_volume]} 
                                max={5000000} 
                                step={50000} 
                                onValueChange={(vals) => setFilters({...filters, min_volume: vals[0]})}
                            />
                        </div>
                    </div>

                    <SheetFooter>
                        <SheetClose asChild>
                            <Button onClick={() => fetchScreener()} className="w-full font-black uppercase tracking-widest">
                                Run Scan
                            </Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-card/30 p-4 rounded-lg border border-border/50">
        <div className="flex-1 space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Quick Presets</Label>
            <Select value={selectedPreset} onValueChange={applyPreset}>
                <SelectTrigger className="bg-background border-border/50 font-bold">
                    <SelectValue placeholder="Select Strategy..." />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(PRESETS).map(([key, preset]) => (
                        <SelectItem key={key} value={key} className="font-medium">
                            {preset.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        
        {/* Quick Stats / Active Filters Display */}
        <div className="flex-[3] flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {filters.min_relative_volume > 0 && (
                <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
                    RVol &gt; {filters.min_relative_volume}x
                </Badge>
            )}
            {filters.min_gap_percent > -100 && (
                <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
                    Gap &gt; {filters.min_gap_percent}%
                </Badge>
            )}
             {filters.max_gap_percent < 100 && (
                <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
                    Gap &lt; {filters.max_gap_percent}%
                </Badge>
            )}
            {filters.min_volume > 0 && (
                <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
                    Vol &gt; {formatLarge(filters.min_volume)}
                </Badge>
            )}
             {filters.min_price > 0 && (
                <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
                    $ &gt; {filters.min_price}
                </Badge>
            )}
        </div>
      </div>

      {/* Results Table */}
      <div className="flex-1 min-h-0 bg-card rounded-lg border border-border/50 overflow-hidden flex flex-col">
        <div className="p-2 border-b border-border/50 bg-muted/20 flex justify-between items-center">
            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-2">
                Scanner Results ({data.length})
            </span>
        </div>
        <div className="flex-1 overflow-auto">
            <PaginatedTable 
                data={data} 
                columns={columns} 
                isLoading={loading}
            />
        </div>
      </div>
    </div>
  )
}
