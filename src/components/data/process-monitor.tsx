"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2, Loader2, Database } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProcessStep {
  name: string
  status: "pending" | "running" | "completed" | "error"
  progress: number
}

export function ProcessMonitor() {
  const [steps, setSteps] = React.useState<ProcessStep[]>([
    { name: "Downloading Prices (FMP)", status: "completed", progress: 100 },
    { name: "Bundling Zipline Data", status: "running", progress: 45 },
    { name: "Cleaning Fundamentals", status: "pending", progress: 0 },
    { name: "Syncing DuckDB", status: "pending", progress: 0 },
  ])

  // Simulate progress for demo
  React.useEffect(() => {
    const timer = setInterval(() => {
      setSteps(prev => prev.map(step => {
        if (step.status === "running") {
            const nextProgress = Math.min(step.progress + 1, 99)
            return { ...step, progress: nextProgress }
        }
        return step
      }))
    }, 500)
    return () => clearInterval(timer)
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle>Ingestion Engine</CardTitle>
                <CardDescription>Daily data pipeline status</CardDescription>
            </div>
            <Database className="text-muted-foreground h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {steps.map((step) => (
          <div key={step.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {step.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {step.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {step.status === "pending" && <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />}
                <span className={cn(step.status === "pending" && "text-muted-foreground")}>
                  {step.name}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {step.progress}%
              </span>
            </div>
            <Progress value={step.progress} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
