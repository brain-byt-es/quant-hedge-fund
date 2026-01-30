"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Search, Check, ChevronsUpDown } from "lucide-react"
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
    allSymbols?: string[]
}

export function SignalControlCenter({ symbol, setSymbol, lookback, setLookback, allSymbols = [] }: SignalControlCenterProps) {
  const [open, setOpen] = useState(false)

  // Filter optimization: Limit the list passed to command if it's massive (Command can lag with 5000 items)
  // But for now, let's trust cmk or slice it
  const symbols = allSymbols.length > 0 ? allSymbols.sort() : ["RGTI", "AAPL", "NVDA", "MSFT"]

  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md shadow-xl p-4">
        <div className="flex flex-col md:flex-row items-center gap-6">
            
            {/* Symbol Search (Combobox) */}
            <div className="flex-1 w-full space-y-2">
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
                      <CommandList>
                        <CommandEmpty>No symbol found.</CommandEmpty>
                        <CommandGroup>
                          {symbols.slice(0, 5000).map((s) => ( // Virtualize/Limit for perf
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
                    <label className="text-xs uppercase text-muted-foreground font-black tracking-widest">Lookback Window</label>
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
        </div>
    </Card>
  )
}
