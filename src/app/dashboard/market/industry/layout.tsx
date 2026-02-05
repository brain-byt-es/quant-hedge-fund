"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { IconChartCandle } from "@tabler/icons-react"

const tabs = [
  { name: "Overview", href: "/dashboard/market/industry" },
  { name: "Sectors", href: "/dashboard/market/industry/sectors" },
  { name: "Industries", href: "/dashboard/market/industry/all" },
]

export default function IndustryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col space-y-6 h-full w-full max-w-[1600px] mx-auto px-2">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_-3px_var(--primary)]">
                <IconChartCandle className="size-6 text-primary" />
            </div>
            <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase italic">
                    Stocks by Industry
                </h1>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">
                    Global Market Taxonomy
                </p>
            </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                    : "bg-background border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
