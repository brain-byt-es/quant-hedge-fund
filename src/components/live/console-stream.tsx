"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useEffect, useRef, useState } from "react"

interface LogEntry {
  id: number
  timestamp: string
  source: string
  message: string
  type: "info" | "warning" | "error" | "success"
}

export function ConsoleStream() {
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, timestamp: "09:30:01", source: "OMEGA", message: "Connection established to IBKR Gateway:4002", type: "success" },
    { id: 2, timestamp: "09:30:05", source: "RISK", message: "Portfolio margin check passed. Buying Power: $5.32M", type: "info" },
    { id: 3, timestamp: "09:31:00", source: "STRATEGY", message: "Scanning universe for Momentum setups...", type: "info" },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Simulate incoming logs
    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        source: Math.random() > 0.5 ? "OMEGA" : "STRATEGY",
        message: Math.random() > 0.5 ? "Order filled AAPL @ 150.00" : "re-calibrating volatility index",
        type: "info"
      }
      setLogs(prev => [...prev.slice(-50), newLog]) // Keep last 50
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col bg-black border border-border rounded-lg overflow-hidden font-mono text-xs md:text-sm">
      <div className="bg-muted/50 p-2 border-b border-border text-muted-foreground flex justify-between">
         <span>System Console</span>
         <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/20 border border-red-500"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
            <div className="h-3 w-3 rounded-full bg-green-500/20 border border-green-500"></div>
         </div>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="text-muted-foreground opacity-50">[{log.timestamp}]</span>
              <span className={`font-bold w-20 ${
                log.source === "OMEGA" ? "text-cyan-400" : 
                log.source === "RISK" ? "text-rose-400" : "text-yellow-400"
              }`}>
                [{log.source}]
              </span>
              <span className="text-foreground">{log.message}</span>
            </div>
          ))}
          <div className="animate-pulse text-primary">_</div>
        </div>
      </ScrollArea>
    </div>
  )
}
