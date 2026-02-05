"use client"

import React from "react"
import { usePathname, useParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    IconTarget,
    IconPlus,
    IconBell,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useTrading } from "@/components/providers/trading-provider"

const TABS = [
    { name: "Overview", href: "" },
    { name: "Financials", href: "/financials" },
    { name: "Statistics", href: "/statistics" },
    { name: "Metrics", href: "/metrics" },
    { name: "Forecast", href: "/forecast" },
    { name: "Options", href: "/options" },
    { name: "Insider", href: "/insider" },
    { name: "Dividends", href: "/dividends" },
    { name: "History", href: "/history" },
    { name: "Profile", href: "/profile" },
]

export default function StockLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { ticker } = useParams()
    const { openOrder } = useTrading()
    const symbol = (ticker as string)?.toUpperCase()

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* 1. TICKER HEADER (STOCKNEAR STYLE) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 pt-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xl italic">
                        {symbol?.slice(0, 1)}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tighter uppercase">{symbol}</h1>
                            <Badge variant="outline" className="text-[10px] h-5 border-border/50 bg-muted/20 font-mono">NASDAQ</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                            Company Name Placeholder
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50">
                        <IconPlus className="size-3 mr-2" /> Watchlist
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest border-border/50">
                        <IconBell className="size-3 mr-2" /> Alert
                    </Button>
                    <Button 
                        size="sm" 
                        className="h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                        onClick={() => openOrder(symbol)}
                    >
                        <IconTarget className="size-3 mr-2" /> Target Order
                    </Button>
                </div>
            </div>

            {/* 2. NESTED TABS (STOCKNEAR STYLE) */}
            <nav className="border-b border-border/50 px-4 overflow-x-auto custom-scrollbar">
                <ul className="flex items-center gap-1 pb-3">
                    {TABS.map((tab) => {
                        const href = `/dashboard/stocks/${ticker}${tab.href}`
                        const isActive = pathname === href
                        
                        return (
                            <li key={tab.name}>
                                <Link href={href}>
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className={cn(
                                            "h-8 rounded-full px-4 text-xs font-bold transition-all whitespace-nowrap",
                                            isActive 
                                                ? "bg-violet-500/10 text-violet-500 border border-violet-500/20" 
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {tab.name}
                                    </Button>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* 3. CONTENT AREA */}
            <div className="flex-1 min-h-0 px-4 pb-8">
                {children}
            </div>
        </div>
    )
}