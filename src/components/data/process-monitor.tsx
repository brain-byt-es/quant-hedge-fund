"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Database, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

interface ProcessStep {
  name: string
  status: "pending" | "running" | "completed" | "error"
  progress: number
}

export function ProcessMonitor() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [steps, setSteps] = React.useState<ProcessStep[]>([
    { name: "Downloading Prices (FMP)", status: "pending", progress: 0 },
    { name: "Bundling Zipline Data", status: "pending", progress: 0 },
    { name: "Cleaning Fundamentals", status: "pending", progress: 0 },
    { name: "Syncing DuckDB", status: "pending", progress: 0 },
  ]);

  const handleRunPipeline = async () => {
      setIsRunning(true);
      // Reset steps
      setSteps(s => s.map(step => ({ ...step, status: "pending", progress: 0 })));
      
      try {
          // 1. Trigger Download
          setSteps(s => s.map(step => step.name.includes("Downloading") ? { ...step, status: "running", progress: 50 } : step));
          
          await api.triggerIngestion({ start_date: "2023-01-01" });
          
          // Since API is fire-and-forget background task, we optimistically show "Started"
          // In a real app, we'd poll a task ID. For now, we simulate completion of the *request*.
          setSteps(s => s.map(step => step.name.includes("Downloading") ? { ...step, status: "completed", progress: 100 } : step));
          
          // Mark others as scheduled
          setSteps(s => s.map(step => !step.name.includes("Downloading") ? { ...step, status: "pending", progress: 0 } : step));
          
      } catch (e) {
          console.error(e);
          setSteps(s => s.map(step => ({ ...step, status: "error" })));
      } finally {
          setTimeout(() => setIsRunning(false), 2000);
      }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle>Ingestion Engine</CardTitle>
                <CardDescription>Daily data pipeline status</CardDescription>
            </div>
            <Button size="sm" onClick={handleRunPipeline} disabled={isRunning}>
                {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Run Pipeline
            </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {steps.map((step) => (
          <div key={step.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {step.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {step.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {step.status === "error" && <Database className="h-4 w-4 text-red-500" />}
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
