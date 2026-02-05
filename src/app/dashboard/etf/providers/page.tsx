"use client"

import { useState, useEffect } from "react"
import { CompactGrid } from "@/components/market-hub/compact-grid"
import { Badge } from "@/components/ui/badge"
import { 
    IconBuildingBank, 
    IconRefresh,
    IconSearch,
    IconArrowRight
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface IssuerItem {
  issuer: string
  fundCount: number
  totalAUM: number
  marketShare: number
  symbol?: string
  ticker?: string
}

export default function ETFProvidersPage() {
    const [issuers, setIssuers] = useState<IssuerItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")

    const fetchIssuers = async () => {
        setIsLoading(true)
        try {
            // Simulated dummy data based on reference structure
            const dummyData: IssuerItem[] = [
                { issuer: "BlackRock (iShares)", fundCount: 412, totalAUM: 2800000000000, marketShare: 34.2 },
                { issuer: "Vanguard", fundCount: 84, totalAUM: 2400000000000, marketShare: 29.5 },
                { issuer: "State Street (SPDR)", fundCount: 138, totalAUM: 1200000000000, marketShare: 14.8 },
                { issuer: "Invesco", fundCount: 220, totalAUM: 540000000000, marketShare: 6.7 },
                { issuer: "Charles Schwab", fundCount: 31, totalAUM: 320000000000, marketShare: 3.9 },
            ]
            setIssuers(dummyData)
        } catch (err) {
            toast.error("Failed to fetch ETF providers")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchIssuers()
    }, [])

    const formatAUM = (num: number) => {
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
        return `$${num.toLocaleString()}`
    }

    const columns = [
        {
            header: "Issuer",
            accessorKey: "issuer",
            cell: (item: IssuerItem) => (
                <span className="text-xs font-black group-hover:text-primary transition-colors">{item.issuer}</span>
            )
        },
        {
            header: "Funds",
            accessorKey: "fundCount",
            cell: (item: IssuerItem) => <span className="font-mono text-xs font-bold">{item.fundCount}</span>
        },
        {
            header: "Total AUM",
            accessorKey: "totalAUM",
            cell: (item: IssuerItem) => (
                <span className="font-mono text-xs font-bold text-primary">{formatAUM(item.totalAUM)}</span>
            )
        },
        {
            header: "Market Share",
            accessorKey: "marketShare",
            cell: (item: IssuerItem) => (
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${item.marketShare}%` }} />
                    </div>
                    <span className="text-[10px] font-bold font-mono">{item.marketShare}%</span>
                </div>
            )
        }
    ]

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <IconBuildingBank className="size-5 text-primary" />
                        <h1 className="text-2xl font-black tracking-tighter uppercase italic">ETF Providers</h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">
                        Top Asset Managers & Fund Issuers by AUM
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input 
                            placeholder="Search Issuer..." 
                            className="h-9 pl-9 text-[11px] font-bold uppercase tracking-widest bg-muted/20 border-border/50 rounded-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50" onClick={fetchIssuers}>
                        <IconRefresh className={cn("size-3 mr-2", isLoading && "animate-spin")} /> Update
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Market Concentration</span>
                        <Badge variant="secondary" className="text-[8px] font-mono h-4">TOP ISSUERS</Badge>
                    </div>
                    <CompactGrid 
                        data={issuers.filter(i => i.issuer.toLowerCase().includes(search.toLowerCase()))} 
                        columns={columns} 
                        isLoading={isLoading} 
                    />
                </div>
            </div>
        </div>
    )
}
