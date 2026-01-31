"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Search, Check, ChevronsUpDown, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SignalControlCenterProps {
    symbol: string
    setSymbol: (s: string) => void
    lookback: number
    setLookback: (l: number) => void
    minMCap: number
    setMinMCap: (v: number) => void
    minVolume: number
    setMinVolume: (v: number) => void
    onUpdateUniverse: () => void
    isUpdating?: boolean
    allSymbols?: string[]
}

export function SignalControlCenter({ 
    symbol, setSymbol, lookback, setLookback, 
    minMCap, setMinMCap, minVolume, setMinVolume,
    onUpdateUniverse, isUpdating,
    allSymbols = [] 
}: SignalControlCenterProps) {
  const [open, setOpen] = useState(false)

  // Filter optimization
  const symbols = allSymbols.length > 0 ? [...allSymbols].sort() : ["RGTI", "AAPL", "NVDA", "MSFT"]

  const formatMillions = (val: number) => {
      if (val >= 1000) return `${(val/1000).toFixed(1)}B`
      return `${val}M`
  }

  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md shadow-xl p-4">
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Symbol Search (Combobox) */}
                <div className="w-full md:w-[250px] space-y-2">
                    <label className="text-xs uppercase text-muted-foreground font-black tracking-widest flex items-center gap-2">
                        <Search className="h-3 w-3 text-primary" /> Focus Symbol
                    </label>
                    
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between h-9 bg-background/50 border-border text-foreground font-mono font-bold"
                        >
                          {symbol || "Select symbol..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search ticker..." />
                          <CommandList className="max-h-[300px]">
                            <CommandEmpty>No symbol found.</CommandEmpty>
                            <CommandGroup>
                              {symbols.slice(0, 5000).map((s) => (
                                <CommandItem
                                  key={s}
                                  value={s}
                                  onSelect={(currentValue) => {
                                    setSymbol(currentValue.toUpperCase())
                                    setOpen(false)
                                  }}
                                  className="font-mono font-medium"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      symbol === s ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {s}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                </div>

                {/* Lookback Slider */}
                <div className="flex-1 w-full space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs uppercase text-muted-foreground font-black tracking-widest">Analysis Window</label>
                        <span className="text-xs font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{lookback} Days</span>
                    </div>
                    <Slider 
                        value={[lookback]} 
                        onValueChange={(v) => setLookback(v[0])} 
                        min={20} 
                        max={504} 
                        step={1}
                        className="py-3"
                    />
                </div>

                {/* Update Action */}
                <div className="w-full md:w-auto self-end">
                    <Button 
                        onClick={onUpdateUniverse} 
                        disabled={isUpdating}
                        className="w-full h-9 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-black uppercase tracking-widest text-[10px]"
                    >
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                        Sync Universe
                    </Button>
                </div>
            </div>

            {/* Institutional Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/20">
                {/* Min Market Cap */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs uppercase text-muted-foreground font-black tracking-widest">Min Market Cap</label>
                        <span className="text-xs font-mono text-chart-4 font-bold bg-chart-4/10 px-2 py-0.5 rounded border border-chart-4/20">{formatMillions(minMCap)}</span>
                    </div>
                    <Slider 
                        value={[minMCap]} 
                        onValueChange={(v) => setMinMCap(v[0])} 
                        min={50} 
                        max={10000} 
                        step={50}
                        className="py-3"
                    />
                </div>

                {/* Min Volume */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs uppercase text-muted-foreground font-black tracking-widest">Min Daily Volume</label>
                        <span className="text-xs font-mono text-chart-3 font-bold bg-chart-3/10 px-2 py-0.5 rounded border border-chart-3/20">{formatMillions(minVolume)}</span>
                    </div>
                    <Slider 
                        value={[minVolume]} 
                        onValueChange={(v) => setMinVolume(v[0])} 
                        min={0.1} 
                        max={50} 
                        step={0.1}
                        className="py-3"
                    />
                </div>
            </div>
        </div>
    </Card>
  )
}
