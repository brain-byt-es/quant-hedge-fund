"use client"

import { useState, useEffect } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { Badge } from "@/components/ui/badge"
import { 
    IconFilter, 
    IconRefresh,
    IconSearch,
    IconTornado,
    IconTrendingUp,
    IconSettings2,
    IconDownload
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface OptionsContract {
  symbol: string
  name: string
  strike: number
  optionType: "Call" | "Put"
  iv: number
  ivRank: number
  volume: number
  oi: number
  premium: number
  expiry: string
  changesPercentage?: number
  change_percent?: number
}

export default function OptionsScreenerPage() {
    const [contracts, setContracts] = useState<OptionsContract[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")

    const fetchContracts = async () => {
        setIsLoading(true)
        try {
            // Simulated dummy data based on reference structure
            const dummyData: OptionsContract[] = [
                { symbol: "NVDA", name: "NVIDIA Corp", strike: 150, optionType: "Call", iv: 0.65, ivRank: 0.82, volume: 12400, oi: 45000, premium: 450000, expiry: "2026-03-20", change_percent: 2.4 },
                { symbol: "TSLA", name: "Tesla Inc", strike: 180, optionType: "Put", iv: 0.72, ivRank: 0.45, volume: 8500, oi: 32000, premium: 125000, expiry: "2026-06-19", change_percent: -1.2 },
                { symbol: "AAPL", name: "Apple Inc", strike: 240, optionType: "Call", iv: 0.32, ivRank: 0.15, volume: 5600, oi: 120000, premium: 89000, expiry: "2026-02-20", change_percent: 0.5 },
                { symbol: "AMD", name: "Advanced Micro Devices", strike: 170, optionType: "Call", iv: 0.58, ivRank: 0.64, volume: 9200, oi: 28000, premium: 310000, expiry: "2026-03-20", change_percent: 4.1 },
                { symbol: "MSFT", name: "Microsoft Corp", strike: 420, optionType: "Put", iv: 0.28, ivRank: 0.12, volume: 3400, oi: 15000, premium: 42000, expiry: "2026-02-20", change_percent: -0.3 },
            ]
            setContracts(dummyData)
        } catch (err) {
            toast.error("Failed to fetch options contracts")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchContracts()
    }, [])

    const columns = [
        {
            header: "Symbol",
            accessorKey: "symbol",
            className: "w-[100px]"
        },
        {
            header: "Strike",
            accessorKey: "strike",
            cell: (item: OptionsContract) => <span className="font-mono text-xs font-bold">${item.strike}</span>
        },
        {
            header: "Type",
            accessorKey: "optionType",
            cell: (item: OptionsContract) => (
                <span className={cn(
                    "text-[10px] font-black uppercase",
                    item.optionType === "Call" ? "text-green-500" : "text-red-500"
                )}>{item.optionType}</span>
            )
        },
        {
            header: "IV Rank",
            accessorKey: "ivRank",
            cell: (item: OptionsContract) => (
                <div className="flex items-center gap-2">
                    <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${item.ivRank * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold font-mono">{(item.ivRank * 100).toFixed(0)}%</span>
                </div>
            )
        },
        {
            header: "Volume",
            accessorKey: "volume",
            cell: (item: OptionsContract) => <span className="font-mono text-xs opacity-70">{item.volume.toLocaleString()}</span>
        },
        {
            header: "Open Interest",
            accessorKey: "oi",
            cell: (item: OptionsContract) => <span className="font-mono text-xs opacity-70">{item.oi.toLocaleString()}</span>
        },
        {
            header: "Expiry",
            accessorKey: "expiry",
            cell: (item: OptionsContract) => <span className="text-[10px] font-medium text-muted-foreground uppercase">{item.expiry}</span>
        }
    ]

    return (
        <div className="flex flex-col h-full space-y-6 p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconTornado className="size-6 text-violet-500" />
                        <h1 className="text-2xl font-black tracking-tighter italic uppercase">Options Screener</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">
                        Filter by Unusual Flow, IV Rank & Greeks
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest border-border/50">
                        <IconDownload className="size-3 mr-2" /> Export
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest border-border/50">
                        <IconSettings2 className="size-3 mr-2" /> Save Screen
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 flex items-center gap-2">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground opacity-50" />
                        <Input 
                            placeholder="Filter contracts (e.g. Strike > 200, IV Rank > 80%)..." 
                            className="pl-9 h-10 bg-card/40 border-border/50 font-mono text-xs focus-visible:ring-violet-500/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="h-10 border-border/50 bg-card/40 px-4 text-[10px] font-black uppercase tracking-widest">
                        <IconFilter className="size-4 mr-2" /> All Filters
                    </Button>
                </div>
                <Button className="h-10 bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-widest shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                    <IconRefresh className="size-4 mr-2" /> Run Screen
                </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                <PaginatedTable 
                    data={contracts} 
                    columns={columns} 
                    isLoading={isLoading} 
                />
            </div>
        </div>
    )
}
