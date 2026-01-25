"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Database, Play, AlertTriangle } from "lucide-react"
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
  const [details, setDetails] = React.useState("");

  const handleRunPipeline = async () => {
      setIsRunning(true);
      // Reset UI
      setSteps(s => s.map(step => ({ ...step, status: "pending", progress: 0 })));
      
      try {
          // Fetch full market history (last 5 years)
          const fiveYearsAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0];
          await api.triggerIngestion({ 
              start_date: fiveYearsAgo,
          });
      } catch (e) {
          console.error(e);
          setIsRunning(false);
      }
  };

  // Poll for progress
  React.useEffect(() => {
      let interval: NodeJS.Timeout;
      
      const pollProgress = async () => {
          try {
              // Add a new endpoint to api.ts for this
              const res = await fetch("/api/data/ingest/progress"); 
              if (!res.ok) return;
              const state = await res.json();
              
              if (state.status === "idle") {
                  if (isRunning) setIsRunning(false); // Stop if backend reset
                  return;
              }
              
              setIsRunning(state.status === "running");
              setDetails(state.details || "");

              // Map backend steps to UI steps
              setSteps(prev => {
                  return prev.map(step => {
                      if (state.step.includes("Downloading") && step.name.includes("Downloading")) {
                          return { ...step, status: state.status === "error" ? "error" : state.status === "completed" ? "completed" : "running", progress: state.progress };
                      }
                      if (state.step.includes("Bundling") && step.name.includes("Bundling")) {
                          // Mark previous as done
                          if (step.name.includes("Downloading")) return { ...step, status: "completed", progress: 100 };
                          return { ...step, status: state.status === "running" ? "running" : "completed", progress: state.progress };
                      }
                      if (state.status === "completed") {
                          return { ...step, status: "completed", progress: 100 };
                      }
                      return step;
                  });
              });

          } catch (e) {
              console.error("Polling error", e);
          }
      };

      if (isRunning) {
          interval = setInterval(pollProgress, 1000);
      }

      return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle>Ingestion Engine</CardTitle>
                <CardDescription>Daily data pipeline status {details && `(${details})`}</CardDescription>
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
                {step.status === "error" && <AlertTriangle className="h-4 w-4 text-red-500" />}
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
