"use client"

import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { api } from "@/lib/api"
import { PaginatedTable } from "@/components/market-hub/paginated-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
    IconChartCandle, 
    IconFilter,
    IconSearch,
    IconBox,
    IconCurrencyBitcoin,
    IconChevronDown,
    IconCheck
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useStock360 } from "@/components/providers/stock-360-provider"
import { useSettings } from "@/components/providers/settings-provider"
import { CountryMultiSelect } from "@/components/ui/country-multi-select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface Asset {
    symbol: string
    name: string
    type: string
    category: string
    exchange: string
    country: string
    price?: number
    change_percent?: number
    market_cap?: number
}

// Generic Page Component for Market Lists
export default function MarketListPage() {
    const pathname = usePathname()
    const { openStock360 } = useStock360()
    const { settings, updateSettings } = useSettings()
    
    // Parse URL params more robustly
    const pathParts = pathname.split('/')
    const section = pathParts[3] || 'stocks'
    const filterMode = pathParts[4] || 'all'

    const [assets, setAssets] = useState<Asset[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [options, setOptions] = useState<string[]>([])
    const [selectedOption, setSelectedOption] = useState<string | string[] | null>(null)
    const [openFilter, setOpenFilter] = useState(false)

    // Map URL section to DB types
    const getAssetType = useCallback(() => {
        if (section === 'stocks') return 'Equity'
        if (section === 'etfs') return 'ETF'
        if (section === 'crypto') return 'Crypto'
        return 'Equity'
    }, [section])

    const getFilterColumn = useCallback(() => {
        if (filterMode === 'sectors') return 'category'
        if (filterMode === 'industries') return 'category' 
        if (filterMode === 'countries') return 'country'
        if (filterMode === 'providers') return 'exchange'
        if (filterMode === 'categories') return 'category'
        return 'category'
    }, [filterMode])

    // Load Filters
    useEffect(() => {
        const loadOptions = async () => {
            if (filterMode === 'all' || filterMode === 'gainers' || filterMode === 'countries') return
            try {
                const col = getFilterColumn()
                const opts = await api.getAssetFilterOptions(col, getAssetType())
                setOptions(opts)
            } catch (e) {
                console.error("Options load error", e)
            }
        }
        loadOptions()
    }, [getAssetType, getFilterColumn, filterMode])

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                const filters: Record<string, string | string[]> = {}
                
                if (selectedOption) {
                    const col = getFilterColumn()
                    filters[col] = selectedOption
                }
                
                // Global Settings Filter (Only if not manually filtering by country)
                if (filterMode !== 'countries') {
                    const markets = settings.showOnlyPreferred ? settings.preferredMarkets : undefined
                    if (markets) {
                        filters["countries"] = markets
                    }
                }
                
                let data: Asset[] = []
                if (search.length > 2) {
                    const markets = settings.showOnlyPreferred ? settings.preferredMarkets : undefined
                    data = await api.globalSearch(search, 500, getAssetType(), markets)
                } else {
                    data = await api.getAssetList(getAssetType(), filters, 10000, 0)
                }
                
                setAssets(data)
            } catch (e) {
                console.error("Data load error", e)
            } finally {
                setIsLoading(false)
            }
        }
        
        const timer = setTimeout(loadData, 300)
        return () => clearTimeout(timer)
    }, [getAssetType, getFilterColumn, selectedOption, search, settings.showOnlyPreferred, settings.preferredMarkets, filterMode])

    const columns = [
        {
            header: "Symbol",
            accessorKey: "symbol",
            cell: (item: Asset) => <span className="font-black font-mono text-primary group-hover:text-primary transition-colors">{item.symbol}</span>,
            className: "w-[80px]",
            sortable: true
        },
        {
            header: "Price",
            accessorKey: "price",
            cell: (item: Asset) => (
                <span className="font-mono font-bold text-foreground">
                    {item.price ? `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                </span>
            ),
            sortable: true,
            className: "text-right"
        },
        {
            header: "Change",
            accessorKey: "change_percent",
            cell: (item: Asset) => {
                if (item.change_percent === undefined || item.change_percent === null) return <span className="text-muted-foreground">-</span>
                const isPos = item.change_percent >= 0
                return (
                    <span className={cn("font-mono font-bold", isPos ? "text-emerald-500" : "text-red-500")}>
                        {isPos ? "+" : ""}{item.change_percent.toFixed(2)}%
                    </span>
                )
            },
            sortable: true,
            className: "text-right"
        },
        {
            header: "Name",
            accessorKey: "name",
            cell: (item: Asset) => <span className="text-xs font-bold truncate max-w-[250px] block">{item.name}</span>,
            sortable: true
        },
        {
            header: "Industry / Category",
            accessorKey: "category",
            cell: (item: Asset) => <Badge variant="outline" className="text-[9px] h-5 bg-muted/10 border-border/50 font-normal whitespace-nowrap">{item.category}</Badge>
        },
        {
            header: "Country",
            accessorKey: "country",
            cell: (item: Asset) => <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{item.country}</span>
        }
    ]

    const getIcon = () => {
        if (section === 'stocks') return IconChartCandle
        if (section === 'etfs') return IconBox
        if (section === 'crypto') return IconCurrencyBitcoin
        return IconChartCandle
    }
    const PageIcon = getIcon()

    return (
        <div className="flex flex-col space-y-6 h-full pb-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/10 p-6 rounded-2xl border border-border/40 shadow-2xl">
                <div className="flex items-center gap-5">
                    <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_-5px_var(--primary)]">
                        <PageIcon className="size-8 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
                            {section} Terminal
                        </h1>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest px-2 py-0 h-4">{filterMode}</Badge>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em]">
                                Global Master Index • {assets.length} Assets
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Quick Market Toggle */}
                    <div className="flex items-center gap-2 mr-4 bg-background/50 p-1.5 rounded-full border border-border/50 shadow-inner">
                        <Button 
                            variant={settings.showOnlyPreferred ? "default" : "ghost"} 
                            size="sm" 
                            className={cn(
                                "h-7 text-[9px] font-black uppercase tracking-widest rounded-full px-3 transition-all",
                                settings.showOnlyPreferred ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"
                            )}
                            onClick={() => updateSettings({ showOnlyPreferred: true })}
                        >
                            Preferred
                        </Button>
                        <Button 
                            variant={!settings.showOnlyPreferred ? "default" : "ghost"} 
                            size="sm" 
                            className={cn(
                                "h-7 text-[9px] font-black uppercase tracking-widest rounded-full px-3 transition-all",
                                !settings.showOnlyPreferred ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"
                            )}
                            onClick={() => updateSettings({ showOnlyPreferred: false })}
                        >
                            Global
                        </Button>
                    </div>

                    {/* Professional Filter */}
                    {filterMode === 'countries' ? (
                        <div className="w-[300px]">
                            <CountryMultiSelect 
                                defaultValue={Array.isArray(selectedOption) ? selectedOption : []}
                                onChange={(values) => setSelectedOption(values.length > 0 ? values : null)}
                                placeholder="Filter by Country..."
                            />
                        </div>
                    ) : options.length > 0 && (
                        <Popover open={openFilter} onOpenChange={setOpenFilter}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openFilter}
                                    className="w-[220px] justify-between h-10 text-[10px] font-black uppercase tracking-widest border-border/50 bg-background/50 backdrop-blur-md rounded-full px-4"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <IconFilter className="size-3 shrink-0 text-primary" />
                                        <span className="truncate">{typeof selectedOption === 'string' ? selectedOption : `Filter ${filterMode}`}</span>
                                    </div>
                                    <IconChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-0" align="end">
                                <Command className="bg-popover/95 backdrop-blur-xl">
                                    <CommandInput placeholder={`Search ${filterMode}...`} className="h-10 text-xs" />
                                    <CommandList className="custom-scrollbar">
                                        <CommandEmpty>No {filterMode} found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={() => {
                                                    setSelectedOption(null)
                                                    setOpenFilter(false)
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest py-3"
                                            >
                                                <IconFilter className="mr-2 h-3 w-3 opacity-50" />
                                                Show All
                                            </CommandItem>
                                            {options.map((opt) => (
                                                <CommandItem
                                                    key={opt}
                                                    value={opt}
                                                    onSelect={(currentValue) => {
                                                        setSelectedOption(currentValue === selectedOption ? null : currentValue)
                                                        setOpenFilter(false)
                                                    }}
                                                    className="text-[10px] font-bold uppercase tracking-wider py-2.5"
                                                >
                                                    <IconCheck
                                                        className={cn(
                                                            "mr-2 h-3 w-3 text-primary",
                                                            selectedOption === opt ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {opt}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    )}

                    <div className="relative w-full md:w-64">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input 
                            placeholder={`Search ${section}...`}
                            className="h-10 pl-10 bg-muted/20 border-border/50 text-xs font-bold uppercase rounded-full focus:bg-background/80 transition-all focus:ring-2 ring-primary/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Data Grid Area */}
            <div className="flex-1 min-h-[600px] border border-border/40 rounded-2xl overflow-hidden bg-card/5 backdrop-blur-sm shadow-inner relative">
                <PaginatedTable 
                    data={assets} 
                    columns={columns} 
                    isLoading={isLoading} 
                    onRowClick={(item: Asset) => {
                        openStock360(item.symbol)
                    }}
                />
            </div>
        </div>
    )
}
