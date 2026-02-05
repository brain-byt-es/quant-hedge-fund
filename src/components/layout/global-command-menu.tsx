"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Settings,
  User,
  Rocket,
  Activity,
  FlaskConical,
  Database,
  Bot,
  Globe,
  Coins,
  Box,
  Hash
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useStock360 } from "@/components/providers/stock-360-provider"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface SearchResult {
    symbol: string
    name: string
    type: string
    exchange: string
    country: string
}

export function GlobalCommandMenu() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const { openStock360 } = useStock360()
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    const handleToggle = () => setOpen((prev) => !prev)

    document.addEventListener("keydown", down)
    window.addEventListener("toggle-command-menu", handleToggle)
    
    return () => {
      document.removeEventListener("keydown", down)
      window.removeEventListener("toggle-command-menu", handleToggle)
    }
  }, [])

  // Debounced Search
  React.useEffect(() => {
      const timer = setTimeout(async () => {
          if (query.length > 1) {
              try {
                  const data = await api.globalSearch(query)
                  setResults(data)
              } catch (e) {
                  console.error(e)
              }
          } else {
              setResults([])
          }
      }, 300)
      return () => clearTimeout(timer)
  }, [query])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  // Grouping logic
  const equities = results.filter(r => r.type === "Equity")
  const etfs = results.filter(r => r.type === "ETF")
  const cryptos = results.filter(r => r.type === "Crypto")
  const others = results.filter(r => !["Equity", "ETF", "Crypto"].includes(r.type))

  const handleAssetSelect = (symbol: string, type: string) => {
      setOpen(false)
      if (type === "Crypto") {
          // Future: open crypto view
          openStock360(symbol) // Stock360 might handle it or fallback
      } else {
          openStock360(symbol)
      }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput 
        placeholder="Type a ticker, company, crypto or command..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Dynamic Results */}
        {equities.length > 0 && (
            <CommandGroup heading="Equities">
                {equities.map((item) => (
                    <CommandItem key={`${item.type}-${item.symbol}`} onSelect={() => handleAssetSelect(item.symbol, item.type)}>
                        <div className="flex items-center w-full">
                            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{item.symbol}</span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <Badge variant="outline" className="h-3 px-1 text-[8px] border-border/50">{item.exchange}</Badge>
                                    <span>{item.country}</span>
                                </div>
                            </div>
                        </div>
                    </CommandItem>
                ))}
            </CommandGroup>
        )}

        {etfs.length > 0 && (
            <CommandGroup heading="ETFs">
                {etfs.map((item) => (
                    <CommandItem key={`${item.type}-${item.symbol}`} onSelect={() => handleAssetSelect(item.symbol, item.type)}>
                        <Box className="mr-2 h-4 w-4 text-violet-500" />
                        <div className="flex flex-col">
                            <span className="font-bold">{item.symbol}</span>
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                        </div>
                    </CommandItem>
                ))}
            </CommandGroup>
        )}

        {cryptos.length > 0 && (
            <CommandGroup heading="Crypto">
                {cryptos.map((item) => (
                    <CommandItem key={`${item.type}-${item.symbol}`} onSelect={() => handleAssetSelect(item.symbol, item.type)}>
                        <Coins className="mr-2 h-4 w-4 text-orange-500" />
                        <div className="flex flex-col">
                            <span className="font-bold">{item.symbol}</span>
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                        </div>
                    </CommandItem>
                ))}
            </CommandGroup>
        )}

        {others.length > 0 && (
            <CommandGroup heading="Other Assets">
                {others.map((item) => (
                    <CommandItem key={`${item.type}-${item.symbol}`} onSelect={() => handleAssetSelect(item.symbol, item.type)}>
                        <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span className="font-bold">{item.symbol}</span>
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                        </div>
                    </CommandItem>
                ))}
            </CommandGroup>
        )}

        {/* Static Commands (Show when query is empty or always at bottom) */}
        {results.length === 0 && (
            <>
                <CommandSeparator />
                <CommandGroup heading="Navigation">
                <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                    <Activity className="mr-2 h-4 w-4" />
                    <span>Go to Mission Control</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/tactical"))}>
                    <Rocket className="mr-2 h-4 w-4" />
                    <span>Go to Tactical Scanner</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/research"))}>
                    <FlaskConical className="mr-2 h-4 w-4" />
                    <span>Go to Research Lab</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/data"))}>
                    <Database className="mr-2 h-4 w-4" />
                    <span>Go to Data Hub</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/ai-quant"))}>
                    <Bot className="mr-2 h-4 w-4" />
                    <span>Ask AI Quant Team</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/hedge-funds"))}>
                    <Globe className="mr-2 h-4 w-4" />
                    <span>Hedge Fund Directory</span>
                </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Settings">
                <CommandItem onSelect={() => runCommand(() => router.push("#"))}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push("#"))}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </CommandItem>
                </CommandGroup>
            </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
