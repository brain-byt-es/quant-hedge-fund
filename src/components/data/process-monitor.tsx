"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Database, Square, Timer, Zap } from "lucide-react"
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
    { name: "Stock List", status: "pending", progress: 0 },
    { name: "Daily Prices", status: "pending", progress: 0 },
    { name: "Annual Financials", status: "pending", progress: 0 },
    { name: "Zipline Bundling", status: "pending", progress: 0 },
  ]);
  const [details, setDetails] = React.useState("");
  const [stats, setStats] = React.useState({ speed: 0, eta: "" });

  const handleRunPipeline = async (mode: "daily" | "backfill") => {
      setIsRunning(true);
      setSteps(s => s.map(step => ({ ...step, status: "pending", progress: 0 })));
      try {
          await api.triggerIngestion({ mode });
      } catch (err) {
          console.error(err);
          setIsRunning(false);
      }
  };

  const handleStopPipeline = async () => {
      try {
          await fetch("/api/data/ingest/stop", { method: "POST" });
          setIsRunning(false);
      } catch (err) {
          console.error("Failed to stop", err);
      }
  };

  // Poll for progress
  React.useEffect(() => {
      const startTime = Date.now();
      
      const pollProgress = async () => {
          try {
              const res = await fetch("/api/data/ingest/progress"); 
              if (!res.ok) return;
              const state = await res.json();
              
              // Sync local state with backend
              const backendRunning = state.status === "running";
              setIsRunning(backendRunning);

              if (state.status === "idle" || state.status === "completed") {
                  if (state.status === "completed") {
                      setSteps(s => s.map(step => ({ ...step, status: "completed", progress: 100 })));
                  }
                  return;
              }
              
              setDetails(state.details || "");

              // Calculate stats
              if (state.details && state.details.includes("/")) {
                  const [curr, total] = state.details.split("/").map(Number);
                  const elapsedSec = (Date.now() - startTime) / 1000;
                  const speed = curr / elapsedSec;
                  const remaining = total - curr;
                  const etaSec = remaining / speed;
                  
                  const etaMin = Math.floor(etaSec / 60);
                  setStats({ 
                      speed: parseFloat(speed.toFixed(1)), 
                      eta: speed > 0 ? `${etaMin}m remaining` : "Calculating..." 
                  });
              }

              setSteps(prev => prev.map(step => {
                  if (state.step.includes("Stock List") && step.name.includes("Stock List")) {
                      return { ...step, status: "running", progress: 100 };
                  }
                  if (state.step.includes("Downloading Prices") && step.name.includes("Prices")) {
                      if (step.name.includes("Stock List")) return { ...step, status: "completed", progress: 100 };
                      return { ...step, status: "running", progress: state.progress };
                  }
                  if (state.step.includes("Ingesting") && step.name.includes("Annual")) {
                      if (step.name.includes("Prices")) return { ...step, status: "completed", progress: 100 };
                      return { ...step, status: "running", progress: state.progress || 50 };
                  }
                  if (state.step.includes("Bundling") && step.name.includes("Bundling")) {
                      if (step.name.includes("Annual")) return { ...step, status: "completed", progress: 100 };
                      return { ...step, status: "running", progress: state.progress };
                  }
                  return step;
              }));

          } catch (err) {
              console.error("Polling error", err);
          }
      };

      pollProgress(); 
      const interval = setInterval(pollProgress, 1000);
      return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Database className="h-4 w-4" /> Ingestion Engine
                </CardTitle>
                <CardDescription className="text-[10px]">
                    {isRunning ? `ACTIVE: ${details}` : "Ready for data sync"}
                </CardDescription>
            </div>
            <div className="flex gap-2">
                {isRunning ? (
                    <Button size="sm" variant="destructive" className="h-7 text-[10px] uppercase font-bold" onClick={handleStopPipeline}>
                        <Square className="mr-1 h-3 w-3 fill-current" /> Stop
                    </Button>
                ) : (
                    <>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold border-border hover:bg-accent" onClick={() => handleRunPipeline("daily")}>
                            <Zap className="mr-1 h-3 w-3 fill-current text-amber-500" /> Daily Sync
                        </Button>
                        <Button size="sm" variant="default" className="h-7 text-[10px] uppercase font-bold bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleRunPipeline("backfill")}>
                            <Database className="mr-1 h-3 w-3 fill-current" /> Full Backfill
                        </Button>
                    </>
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4">
        {steps.map((step) => (
          <div key={step.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-2 uppercase tracking-tight">
                {step.status === "completed" && <CheckCircle2 className="h-3 w-3 text-primary" />}
                {step.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                {step.status === "pending" && <div className="h-3 w-3 rounded-full border border-muted" />}
                <span className={cn(step.status === "pending" ? "text-muted-foreground" : "text-foreground")}>
                  {step.name}
                </span>
              </div>
              <span className="text-primary font-bold">
                {step.progress > 0 ? `${step.progress.toFixed(1)}%` : "0%"}
              </span>
            </div>
            <Progress value={step.progress} className="h-1 bg-muted" />
          </div>
        ))}

        {isRunning && (
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
                <div className="flex items-center gap-2 text-[9px] uppercase text-muted-foreground font-mono">
                    <Zap className="h-3 w-3" /> {stats.speed} sym/s
                </div>
                <div className="flex items-center gap-2 text-[9px] uppercase text-muted-foreground font-mono justify-end">
                    <Timer className="h-3 w-3" /> {stats.eta}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
