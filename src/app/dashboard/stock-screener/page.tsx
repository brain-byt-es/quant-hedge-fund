"use client"

import { useState, useEffect } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
    IconSearch, 
    IconFilter, 
    IconDownload, 
    IconSettings2,
    IconRefresh
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface SignalData {
    symbol: string;
    price: number;
    change_percent: number;
    market_cap: number;
    f_score: number;
    momentum: number;
    sector: string;
}

export default function StockScreenerPage() {
  const [data, setData] = useState<SignalData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    // Fetch top momentum signals as initial screener data
    api.getResearchSignals(252)
      .then(res => {
        if (Array.isArray(res)) setData(res as SignalData[])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatLarge = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B"
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M"
    return num?.toLocaleString() || "-"
  }

  const columns = [
    { header: "Symbol", accessorKey: "symbol", className: "w-[100px]", sortable: true },
    { 
        header: "Price", 
        accessorKey: "price",
        cell: (item: SignalData) => <span className="font-mono text-xs font-bold">${item.price?.toFixed(2)}</span>,
        sortable: true
    },
    { 
        header: "Change", 
        accessorKey: "change_percent",
        cell: (item: SignalData) => (
            <Badge className={cn(
                "h-5 text-[10px] font-black border-none",
                item.change_percent >= 0 ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
            )}>
                {item.change_percent >= 0 ? "+" : ""}{item.change_percent?.toFixed(2)}%
            </Badge>
        ),
        sortable: true
    },
    { 
        header: "Market Cap", 
        accessorKey: "market_cap",
        cell: (item: SignalData) => <span className="font-mono text-xs opacity-70">{formatLarge(item.market_cap)}</span>,
        sortable: true
    },
    { 
        header: "F-Score", 
        accessorKey: "f_score",
        cell: (item: SignalData) => (
            <div className="flex items-center gap-2">
                <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                    <div 
                        className={cn(
                            "h-full",
                            item.f_score >= 7 ? "bg-primary" : item.f_score <= 3 ? "bg-red-500" : "bg-amber-500"
                        )} 
                        style={{ width: `${(item.f_score / 9) * 100}%` }} 
                    />
                </div>
                <span className="text-[10px] font-bold">{item.f_score}/9</span>
            </div>
        ),
        sortable: true
    },
    { 
        header: "Momentum", 
        accessorKey: "momentum",
        cell: (item: SignalData) => (
            <span className={cn(
                "font-mono text-xs font-black",
                item.momentum >= 80 ? "text-primary" : "text-muted-foreground"
            )}>
                {item.momentum?.toFixed(1)}
            </span>
        ),
        sortable: true
    },
    { 
        header: "Sector", 
        accessorKey: "sector",
        className: "hidden md:table-cell text-[10px] text-muted-foreground uppercase font-medium truncate max-w-[150px]" 
    },
  ]

  const filteredData = data.filter(item => 
    item.symbol.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter italic uppercase flex items-center gap-2">
            <IconFilter className="h-6 w-6 text-primary" /> Stock Screener
          </h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">
            Institutional-grade Universe Filtering
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest">
                <IconDownload className="h-3 w-3 mr-2" /> Export
            </Button>
            <Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest">
                <IconSettings2 className="h-3 w-3 mr-2" /> Save Screen
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 flex items-center gap-2">
            <div className="relative flex-1">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input 
                    placeholder="Search symbols..." 
                    className="pl-9 h-10 bg-card/40 border-border/50 font-mono text-sm focus-visible:ring-primary/20"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <Button variant="outline" className="h-10 border-border/50 bg-card/40 px-4 text-[10px] font-black uppercase tracking-widest">
                <IconFilter className="h-4 w-4 mr-2" /> Filters
            </Button>
        </div>
        <div className="flex items-center gap-2">
            <Select defaultValue="momentum">
                <SelectTrigger className="h-10 bg-card/40 border-border/50 font-black text-[10px] uppercase">
                    <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="momentum">Momentum Score</SelectItem>
                    <SelectItem value="f_score">Piotroski F-Score</SelectItem>
                    <SelectItem value="market_cap">Market Cap</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <PaginatedTable 
            data={filteredData} 
            columns={columns} 
            isLoading={loading}
        />
      </div>

      <div className="flex items-center justify-between py-4 border-t border-border/50 mt-auto">
        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            {filteredData.length} Matches Found
        </span>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-black px-4 disabled:opacity-30">Previous</Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-black px-4">Next</Button>
        </div>
      </div>
    </div>
  )
}