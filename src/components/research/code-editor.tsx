"use client"

import { Button } from "@/components/ui/button"
import { Play, Save, FileCode } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

const sampleCode = `from zipline.api import order_target, record, symbol

def initialize(context):
    context.i = 0
    context.asset = symbol('AAPL')

def handle_data(context, data):
    # Skip first 300 days to get full windows
    context.i += 1
    if context.i < 300:
        return

    # Compute averages
    # history() has to be called with the same params
    # from day to day. Otherwise the cache is rejected.
    short_mavg = data.history(context.asset, 'price', 100, '1d').mean()
    long_mavg = data.history(context.asset, 'price', 300, '1d').mean()

    # Trading logic
    if short_mavg > long_mavg:
        # order_target orders as many shares as needed to
        # achieve the desired number of shares.
        order_target(context.asset, 100)
    elif short_mavg < long_mavg:
        order_target(context.asset, 0)

    # Save values for later inspection
    record(AAPL=data.current(context.asset, 'price'),
           short_mavg=short_mavg,
           long_mavg=long_mavg)`

export function CodeEditor() {
  return (
    <div className="relative h-full font-mono text-sm bg-[#1e1e1e] rounded-lg border border-border overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-8 bg-[#252526] flex items-center px-4 border-b border-[#3e3e3e] text-xs text-muted-foreground select-none">
            strategy.py
        </div>
        <textarea 
            className="w-full h-full p-4 pt-10 bg-transparent text-gray-300 resize-none focus:outline-none"
            defaultValue={sampleCode}
            spellCheck={false}
        />
        {/* Line Numbers Fake Overlay */}
        <div className="absolute top-10 left-0 w-8 text-right pr-2 text-gray-600 select-none pointer-events-none text-sm leading-6">
            {Array.from({length: 25}).map((_, i) => (
                <div key={i}>{i+1}</div>
            ))}
        </div>
    </div>
  )
}
