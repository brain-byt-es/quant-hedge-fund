"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { useWebSocket } from "@/hooks/use-websocket"

export function ConsoleStream() {
  const [logs, setLogs] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data } = useWebSocket<{ type: string; message: string }>("/live/ws/logs")

  useEffect(() => {
    if (data?.type === "log") {
      setTimeout(() => {
          setLogs(prev => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${data.message}`])
      }, 0)
    }
  }, [data])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  // Mock initial logs
  useEffect(() => {
      setTimeout(() => {
          setLogs([
              "[09:30:01] INFO: Trading Engine Started",
              "[09:30:05] INFO: Connected to IBKR Gateway (127.0.0.1:7497)",
              "[09:30:06] INFO: Strategy 'Momentum_V2' Loaded",
              "[09:31:00] EXEC: Buy 100 NVDA @ 485.20",
              "[09:32:15] RISK: VaR Check Passed (Exposure: 45%)"
          ])
      }, 0)
  }, [])

  return (
    <Card className="h-full border-zinc-800 bg-black flex flex-col font-mono text-[10px]">
        <CardHeader className="py-2 border-b border-zinc-800 bg-zinc-950/50">
            <CardTitle className="text-xs uppercase tracking-widest text-zinc-500">System Logs</CardTitle>
        </CardHeader>
        <div className="flex-1 overflow-auto p-2 space-y-1">
            {logs.map((log, i) => (
                <div key={i} className="text-zinc-400 border-l-2 border-transparent hover:border-zinc-700 pl-2">
                    {log}
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    </Card>
  )
}