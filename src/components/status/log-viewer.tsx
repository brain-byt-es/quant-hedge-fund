"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Terminal } from "lucide-react"

interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  details?: string;
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Fetch from our new endpoint
        const res = await fetch("/api/status/logs?limit=100")
        if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data)) {
                setLogs(data)
            } else {
                console.warn("Log data is not an array:", data)
                setLogs([])
            }
        }
      } catch (e) {
        console.error("Failed to fetch logs", e)
      }
    }

    fetchLogs()
    const interval = setInterval(fetchLogs, 2000) // Poll for "streaming" effect
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="h-full bg-background text-primary font-mono border-border flex flex-col overflow-hidden">
      <CardHeader className="py-3 border-b border-border bg-muted/50 flex-none">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Terminal className="h-4 w-4 text-primary" />
            System Execution Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full w-full">
            <div className="space-y-1 p-4 w-full">
                {logs.map((log, i) => (
                    <div key={i} className="text-[11px] flex items-start gap-3 hover:bg-accent/5 p-1 rounded transition-colors border-b border-border/10">
                        <span className="text-muted-foreground shrink-0 opacity-60 w-16 tabular-nums">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <div className="shrink-0 w-20">
                            <Badge variant="outline" className={`text-[9px] h-4 uppercase tracking-tighter px-1 block text-center truncate ${
                                log.level === "ERROR" ? "text-destructive border-destructive/50" : 
                                log.level === "WARNING" ? "text-chart-4 border-chart-4/50" : 
                                "text-muted-foreground border-border"
                            }`}>
                                {log.component}
                            </Badge>
                        </div>
                        <span className="flex-1 whitespace-pre-wrap break-words text-foreground/90 font-mono tracking-tight leading-relaxed">
                            {log.message}
                        </span>
                    </div>
                ))}
                {logs.length === 0 && (
                    <div className="text-muted-foreground italic text-center mt-10">
                        Waiting for system activity...
                    </div>
                )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
