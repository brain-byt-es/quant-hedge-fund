"use client"

import { useState, useEffect } from "react"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { 
    IconBox, 
    IconRefresh,
    IconSearch,
    IconFilter,
    IconDownload,
    IconSettings2
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface ETFItem {
  symbol: string
  name: string
  assetClass: string
  aum: number
  expenseRatio: number
  changesPercentage?: number
  change_percent?: number
}

export default function ETFScreenerPage() {
    const [etfs, setEtfs] = useState<ETFItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")

    const fetchETFs = async () => {
        setIsLoading(true)
        try {
            // Simulated dummy data based on reference structure
            const dummyData: ETFItem[] = [
                { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", assetClass: "Equity: U.S. - Large Cap", aum: 520000000000, expenseRatio: 0.09, change_percent: 0.42 },
                { symbol: "QQQ", name: "Invesco QQQ Trust", assetClass: "Equity: U.S. - Large Cap", aum: 250000000000, expenseRatio: 0.20, change_percent: 0.85 },
                { symbol: "IVV", name: "iShares Core S&P 500 ETF", assetClass: "Equity: U.S. - Large Cap", aum: 440000000000, expenseRatio: 0.03, change_percent: 0.41 },
                { symbol: "VTI", name: "Vanguard Total Stock Market ETF", assetClass: "Equity: U.S. - Total Market", aum: 380000000000, expenseRatio: 0.03, change_percent: 0.38 },
                { symbol: "VOO", name: "Vanguard S&P 500 ETF", assetClass: "Equity: U.S. - Large Cap", aum: 410000000000, expenseRatio: 0.03, change_percent: 0.43 },
            ]
            setEtfs(dummyData)
        } catch {
            toast.error("Failed to fetch ETF list")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchETFs()
    }, [])

    const formatAUM = (num: number) => {
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
        return `$${num.toLocaleString()}`
    }

    const columns = [
        {
            header: "Symbol",
            accessorKey: "symbol",
            className: "w-[100px]"
        },
        {
            header: "Fund Name",
            accessorKey: "name",
            cell: (item: ETFItem) => (
                <span className="text-xs font-bold truncate max-w-[250px] block">{item.name}</span>
            )
        },
        {
            header: "Asset Class",
            accessorKey: "assetClass",
            cell: (item: ETFItem) => (
                <span className="text-[10px] font-medium text-muted-foreground uppercase">{item.assetClass}</span>
            )
        },
        {
            header: "AUM",
            accessorKey: "aum",
            cell: (item: ETFItem) => (
                <span className="font-mono text-xs font-bold">{formatAUM(item.aum)}</span>
            )
        },
        {
            header: "Exp. Ratio",
            accessorKey: "expenseRatio",
            cell: (item: ETFItem) => (
                <span className="font-mono text-xs opacity-70">{item.expenseRatio.toFixed(2)}%</span>
            )
        }
    ]

    return (
        <div className="flex flex-col h-full space-y-6 p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconBox className="size-6 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter italic uppercase">ETF Screener</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">
                        Comprehensive Exchange Traded Funds Database
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
                            placeholder="Search ETFs (e.g. Technology, Vanguard, Dividends)..." 
                            className="pl-9 h-10 bg-card/40 border-border/50 font-mono text-xs focus-visible:ring-primary/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="h-10 border-border/50 bg-card/40 px-4 text-[10px] font-black uppercase tracking-widest">
                        <IconFilter className="size-4 mr-2" /> Filters
                    </Button>
                </div>
                <Button className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                    <IconRefresh className="size-4 mr-2" /> Update Results
                </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                <PaginatedTable 
                    data={etfs} 
                    columns={columns} 
                    isLoading={isLoading} 
                />
            </div>
        </div>
    )
}
