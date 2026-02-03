"use client"

import { useState, useEffect } from "react"
import { Terminal, ChevronUp, ChevronDown, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface LogEntry {
  timestamp: string
  level: "INFO" | "WARN" | "ERROR" | "SYSTEM"
  source: string
  message: string
}

export function ConsoleDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date().toLocaleTimeString(), level: "SYSTEM", source: "Neural Bridge", message: "Interface established. Monitoring Truth Layer." },
    { timestamp: new Date().toLocaleTimeString(), level: "INFO", source: "Omega", message: "Execution Singleton synchronized with Alpaca." },
  ])

  // Simulate incoming logs for demo
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const levels: LogEntry["level"][] = ["INFO", "WARN", "INFO"]
        const sources = ["Data Hub", "Factor Engine", "Tactical Scanner", "Risk Engine"]
        const messages = [
          "Heartbeat signal received.",
          "Snapshot updated successfully.",
          "Scanning candidate universe...",
          "Truth Layer latency: 42ms",
          "Volatility threshold check passed."
        ]
        
        const newLog: LogEntry = {
          timestamp: new Date().toLocaleTimeString(),
          level: levels[Math.floor(Math.random() * levels.length)],
          source: sources[Math.floor(Math.random() * sources.length)],
          message: messages[Math.floor(Math.random() * messages.length)]
        }
        
        setLogs(prev => [newLog, ...prev].slice(0, 100))
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-t border-border bg-background/95 backdrop-blur-xl shadow-2xl",
      isOpen ? "h-[300px]" : "h-10"
    )}
    style={{ left: "var(--sidebar-width)" }}
    >
      {/* Handle / Header */}
      <div 
        className="flex items-center justify-between px-4 h-10 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Console</span>
          <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-mono border-primary/20 text-primary">
            {logs.length} EVENTS
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </div>

      {/* Log Content */}
      <div className={cn("p-0 h-[260px] overflow-hidden", !isOpen && "hidden")}>
        <div className="flex bg-muted/30 border-b border-border/50 px-4 py-1.5 justify-between items-center">
            <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> TRUTH LAYER: OK
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" /> OMEGA: IDLE
                </div>
            </div>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setLogs([]) }}>
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </Button>
        </div>
        <ScrollArea className="h-[230px]">
          <div className="p-4 space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 font-mono text-[10px] py-0.5 border-b border-border/10 last:border-0 hover:bg-muted/30 transition-colors">
                <span className="text-muted-foreground shrink-0 w-16">{log.timestamp}</span>
                <span className={cn(
                  "shrink-0 w-12 font-black",
                  log.level === "ERROR" ? "text-destructive" : 
                  log.level === "WARN" ? "text-yellow-500" : 
                  log.level === "SYSTEM" ? "text-primary" : "text-blue-400"
                )}>
                  [{log.level}]
                </span>
                <span className="text-muted-foreground/70 shrink-0 w-24 truncate">{log.source}</span>
                <span className="text-foreground/90">{log.message}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
