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
    <Card className="h-full bg-background text-primary font-mono border-border">
      <CardHeader className="py-3 border-b border-border bg-muted/50">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Terminal className="h-4 w-4 text-primary" />
            System Execution Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] p-4">
            <div className="space-y-1">
                {logs.map((log, i) => (
                    <div key={i} className="text-xs grid grid-cols-12 gap-2 hover:bg-accent/5 p-1 rounded transition-colors">
                        <span className="col-span-3 text-muted-foreground truncate opacity-60">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="col-span-2">
                            <Badge variant="outline" className={`text-[10px] h-5 uppercase tracking-tighter ${
                                log.level === "ERROR" ? "text-destructive border-destructive/50" : 
                                log.level === "WARNING" ? "text-chart-4 border-chart-4/50" : 
                                "text-muted-foreground border-border"
                            }`}>
                                {log.component}
                            </Badge>
                        </span>
                        <span className="col-span-7 whitespace-pre-wrap break-all text-foreground/90">
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
