"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Database, Play, AlertTriangle, Square, Timer, Zap } from "lucide-react"
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
    { name: "Syncing DuckDB", status: "pending", progress: 0 },
  ]);
  const [details, setDetails] = React.useState("");
  const [stats, setStats] = React.useState({ speed: 0, eta: "" });

  const handleRunPipeline = async () => {
      setIsRunning(true);
      setSteps(s => s.map(step => ({ ...step, status: "pending", progress: 0 })));
      try {
          const fiveYearsAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0];
          await api.triggerIngestion({ start_date: fiveYearsAgo });
      } catch (e) {
          console.error(e);
          setIsRunning(false);
      }
  };

  const handleStopPipeline = async () => {
      try {
          await fetch("/api/data/ingest/stop", { method: "POST" });
          setIsRunning(false);
      } catch (e) {
          console.error("Failed to stop", e);
      }
  };

  // Poll for progress
  React.useEffect(() => {
      let interval: NodeJS.Timeout;
      let startTime = Date.now();
      
      const pollProgress = async () => {
          try {
              const res = await fetch("/api/data/ingest/progress"); 
              if (!res.ok) return;
              const state = await res.json();
              
              if (state.status === "idle" || state.status === "completed") {
                  setIsRunning(false);
                  if (state.status === "completed") {
                      setSteps(s => s.map(step => ({ ...step, status: "completed", progress: 100 })));
                  }
                  return;
              }
              
              setIsRunning(state.status === "running");
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
                  if (state.step.includes("Downloading") && step.name.includes("Downloading")) {
                      return { ...step, status: "running", progress: state.progress };
                  }
                  if (state.step.includes("Bundling") && step.name.includes("Bundling")) {
                      if (step.name.includes("Downloading")) return { ...step, status: "completed", progress: 100 };
                      return { ...step, status: "running", progress: state.progress };
                  }
                  return step;
              }));

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
    <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="text-sm font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
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
                    <Button size="sm" variant="default" className="h-7 text-[10px] uppercase font-bold bg-emerald-600 hover:bg-emerald-500 text-black" onClick={handleRunPipeline}>
                        <Play className="mr-1 h-3 w-3 fill-current" /> Run Pipeline
                    </Button>
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4">
        {steps.map((step) => (
          <div key={step.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-2 uppercase tracking-tight">
                {step.status === "completed" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                {step.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                {step.status === "pending" && <div className="h-3 w-3 rounded-full border border-zinc-800" />}
                <span className={cn(step.status === "pending" ? "text-zinc-600" : "text-zinc-300")}>
                  {step.name}
                </span>
              </div>
              <span className="text-primary font-bold">
                {step.progress > 0 ? `${step.progress.toFixed(1)}%` : "0%"}
              </span>
            </div>
            <Progress value={step.progress} className="h-1 bg-zinc-900" />
          </div>
        ))}

        {isRunning && (
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-zinc-800 pt-3">
                <div className="flex items-center gap-2 text-[9px] uppercase text-zinc-500 font-mono">
                    <Zap className="h-3 w-3" /> {stats.speed} sym/s
                </div>
                <div className="flex items-center gap-2 text-[9px] uppercase text-zinc-500 font-mono justify-end">
                    <Timer className="h-3 w-3" /> {stats.eta}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
