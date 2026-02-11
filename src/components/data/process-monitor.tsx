"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Database, Square, Timer, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

  const handleRunPipeline = async (mode: "daily" | "backfill" | "simfin") => {
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
                  if (state.step.includes("SimFin")) {
                     // If SimFin is running, mark others as skipped/pending or repurpose one
                     // For simplicity, we just mark Financials as running if it's a generic UI
                     if (step.name.includes("Financials")) return { ...step, status: "running", progress: 50 };
                     return step;
                  }

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
    <Card className="h-full border-border bg-card/50 backdrop-blur-sm flex flex-col overflow-hidden">
      <CardHeader className="pb-3 border-b border-border flex-none">
        <div className="flex items-start justify-between">
            <div className="space-y-1">
                <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Database className="h-4 w-4" /> Ingestion Engine
                </CardTitle>
                <CardDescription className="text-[10px]">
                    {isRunning ? `ACTIVE: ${details}` : "Ready for data sync"}
                </CardDescription>
            </div>
            <div className="flex flex-col gap-2 min-w-[140px]">
                {isRunning ? (
                    <Button size="sm" variant="destructive" className="h-8 text-[10px] uppercase font-bold w-full" onClick={handleStopPipeline}>
                        <Square className="mr-2 h-3 w-3 fill-current" /> Stop Ingestion
                    </Button>
                ) : (
                    <TooltipProvider delayDuration={100}>
                        <div className="flex flex-col gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase font-bold border-border hover:bg-accent w-full justify-start" onClick={() => handleRunPipeline("daily")}>
                                        <Zap className="mr-2 h-3 w-3 fill-current text-chart-4" /> Daily Sync
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[200px] text-[10px] font-mono">
                                    <p>Fast daily update. Fetches yesterday&apos;s close and new filings for the active universe.</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" variant="default" className="h-8 text-[10px] uppercase font-bold bg-primary hover:bg-primary/90 text-primary-foreground w-full justify-start" onClick={() => handleRunPipeline("backfill")}>
                                        <Database className="mr-2 h-3 w-3 fill-current" /> Full Backfill
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[200px] text-[10px] font-mono">
                                    <p>Deep sync. Fetches 2 years of price history to fill gaps in SimFin data.</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" variant="secondary" className="h-8 text-[10px] uppercase font-bold w-full justify-start" onClick={() => handleRunPipeline("simfin")}>
                                        <Database className="mr-2 h-3 w-3 fill-current" /> SimFin Bulk
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[200px] text-[10px] font-mono">
                                    <p>Anchor your universe. Downloads the list of 5,000+ curated companies and multi-year history.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="grid gap-4">
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
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
