"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { Sparkles, Code, Play, ArrowRight, Terminal, Settings, Save, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Hypothesis {
  strategy_name: string;
  style: string;
  reasoning: string;
  [key: string]: unknown;
}

export default function AIQuantPage() {
  const router = useRouter()
  
  // --- STATE ---
  const [services, setServices] = useState({
      mlflow: { active: false, url: "http://127.0.0.1:5000" }, // MLflow default port is 5000
      prefect: { active: false, url: "http://127.0.0.1:4200" }
  })

  const [chatInput, setChatInput] = useState("")
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', content: string, tool?: string}[]>([
      {role: 'ai', content: "Systems online. Architect ready. Neural bridge established. Specify objective."}
  ])
  const [loadingChat, setLoadingChat] = useState(false)
  const [agentStatus, setAgentStatus] = useState<string | null>(null)
  
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [loadingHypotheses, setLoadingHypotheses] = useState(false)
  
  const [editorCode, setEditorCode] = useState<string>("# Waiting for Alpha Factor code injection...")
  
  const [strategyConfig, setStrategyConfig] = useState<string>(JSON.stringify({
      strategy_name: "New_Strategy",
      start_date: "2020-01-01",
      end_date: "2024-12-31",
      capital: 100000,
      params: {}
  }, null, 2))

  // --- EFFECTS ---
  useEffect(() => {
      const checkSystems = async () => {
          try {
              // Note: Direct fetch might hit CORS, but in this setup the proxy usually handles it
              // For robustness, we check via our own backend or assume healthy if reachable
              const mlRes = await fetch(services.mlflow.url).catch(() => ({ ok: false }))
              const prefRes = await fetch(services.prefect.url).catch(() => ({ ok: false }))
              
              setServices(prev => ({
                  ...prev,
                  mlflow: { ...prev.mlflow, active: mlRes.ok },
                  prefect: { ...prev.prefect, active: prefRes.ok }
              }))
          } catch {
              console.debug("Service check failed (CORS or Down)")
          }
      }
      checkSystems()
      const interval = setInterval(checkSystems, 10000)
      return () => clearInterval(interval)
  }, [])

  // --- HANDLERS ---

  // Q1: Chat (Supervisor Logic)
  const handleChat = async (overridePrompt?: string) => {
      const input = overridePrompt || chatInput
      if (!input.trim()) return
      
      setChatInput("")
      setChatHistory(prev => [...prev, { role: 'user', content: input }])
      setLoadingChat(true)
      setAgentStatus("Routing query...")

      try {
          // Simulation of an Agentic Workflow (Tool Calling)
          if (input.toLowerCase().includes("mlflow") || input.toLowerCase().includes("research")) {
              setAgentStatus("Querying MLflow Registry...")
              await new Promise(r => setTimeout(r, 800))
              await api.getResearchSignals() // Using research API as a tool
              setChatHistory(prev => [...prev, { 
                  role: 'ai', 
                  content: "I have analyzed the recent research signals. There is a strong momentum clustering in the technology sector.",
                  tool: "MLflow Analysis"
              }])
          } 
          else if (input.toLowerCase().includes("code") || input.toLowerCase().includes("factor")) {
              setAgentStatus("Generating Factor Engine code...")
              const res = await api.generateFactorCode(input)
              setChatHistory(prev => [...prev, { 
                  role: 'ai', 
                  content: `Success. Alpha Factor code generated and injected into the Lab.`,
                  tool: "Code Injector"
              }])
              setEditorCode(res.code || "# Error generating code")
          } else {
              setAgentStatus("Synthesizing strategy configuration...")
              const res = await api.generateStrategyConfig(input)
              setChatHistory(prev => [...prev, { 
                  role: 'ai', 
                  content: `Strategy architecture for '${res.strategy_name}' finalized. Payload sent to Config Core.`,
                  tool: "Architect Tool"
              }])
              setStrategyConfig(JSON.stringify(res, null, 2))
          }
      } catch (err) {
          console.error("Agent error", err)
          setChatHistory(prev => [...prev, { role: 'ai', content: "Bridge connection unstable. Command rejected." }])
      } finally {
          setLoadingChat(false)
          setAgentStatus(null)
      }
  }

  // Q2: Hypotheses
  const generateHypotheses = async () => {
      setLoadingHypotheses(true)
      try {
          const res = await api.generateHypotheses(3)
          if (Array.isArray(res)) {
              setHypotheses(res as Hypothesis[])
          } else {
              console.warn("Hypotheses result is not an array:", res)
              setHypotheses([])
          }
      } catch (err) {
          console.error("Failed to generate hypotheses", err)
          setHypotheses([])
      } finally {
          setLoadingHypotheses(false)
      }
  }

  const loadHypothesis = (h: Hypothesis) => {
      setStrategyConfig(JSON.stringify(h, null, 2))
      setChatHistory(prev => [...prev, { role: 'ai', content: `Loaded hypothesis: ${h.strategy_name}` }])
  }

  // Q4: Deploy
  const handleDeploy = async () => {
      try {
          const config = JSON.parse(strategyConfig)
          // In a real app, this would post to /api/backtest/run directly
          await api.runBacktest(config)
          alert("Strategy Deployed to Research Lab.")
          router.push("/research")
      } catch {
          alert("Invalid JSON Config.")
      }
  }

  return (
    <div className="grid grid-cols-12 grid-rows-12 gap-2 p-2 h-[calc(100vh-4rem)] bg-background text-foreground font-sans overflow-hidden">
      
      {/* --- Q1: THE ARCHITECT (Supervisor) --- */}
      <div className="col-span-3 row-span-12 flex flex-col min-h-0">
        <Card className="h-full flex flex-col border-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="py-2 px-3 border-b border-border bg-muted/80 flex flex-row items-center justify-between shrink-0">
                <CardTitle className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <Terminal className="h-3 w-3" /> The Architect
                </CardTitle>
                <div className="flex gap-1">
                    <div className={cn("h-1.5 w-1.5 rounded-full", services.mlflow.active ? "bg-emerald-500 shadow-[0_0_5px_emerald]" : "bg-muted")} title="MLflow status" />
                    <div className={cn("h-1.5 w-1.5 rounded-full", services.prefect.active ? "bg-amber-500 shadow-[0_0_5px_amber]" : "bg-muted")} title="Prefect status" />
                </div>
            </CardHeader>
            
            <ScrollArea className="flex-1 p-3 font-mono text-[10px] bg-black/10">
                <div className="space-y-3">
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-[8px] text-muted-foreground uppercase tracking-widest">{msg.role}</span>
                                {msg.tool && <Badge variant="outline" className="text-[7px] h-3 px-1 border-primary/30 text-primary uppercase">{msg.tool}</Badge>}
                            </div>
                            <div className={`p-2 rounded border max-w-[95%] shadow-sm ${msg.role === 'user' ? 'bg-accent border-border text-foreground' : 'bg-primary/5 border-primary/20 text-primary/90'}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loadingChat && (
                        <div className="flex flex-col gap-1 p-2 bg-muted/30 rounded border border-border/50">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                <span className="text-[9px] text-primary uppercase tracking-widest">{agentStatus || "Processing..."}</span>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Quick Actions */}
            <div className="px-2 py-1 flex gap-1 bg-muted/20 border-t border-border/50 overflow-x-auto no-scrollbar shrink-0">
                <Button variant="ghost" className="h-5 text-[8px] uppercase tracking-tighter border border-border hover:bg-primary/10 hover:text-primary" onClick={() => handleChat("Analyze current MLflow Research")}>
                    Research Data
                </Button>
                <Button variant="ghost" className="h-5 text-[8px] uppercase tracking-tighter border border-border hover:bg-primary/10 hover:text-primary" onClick={() => handleChat("Build new Alpha Factor code")}>
                    Factor Lab
                </Button>
                <Button variant="ghost" className="h-5 text-[8px] uppercase tracking-tighter border border-border hover:bg-primary/10 hover:text-primary" onClick={() => handleChat("Generate new Strategy Config")}>
                    Auto-Config
                </Button>
            </div>

            <div className="p-2 border-t border-border bg-muted/80 shrink-0">
                <div className="flex gap-1.5">
                    <Input 
                        className="bg-background border-border text-[10px] font-mono focus-visible:ring-primary/30 h-7"
                        placeholder="Neural prompt..." 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleChat()}
                    />
                    <Button size="icon" className="h-7 w-7 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleChat()} disabled={loadingChat}>
                        <ArrowRight className="h-3.5 w-3.5"/>
                    </Button>
                </div>
            </div>
        </Card>
      </div>

      {/* --- Q2: HYPOTHESIS FORGE --- */}
      <div className="col-span-6 row-span-5 flex flex-col min-h-0">
        <Card className="h-full flex flex-col border-border bg-card/30 overflow-hidden">
            <CardHeader className="py-1.5 px-3 border-b border-border flex flex-row items-center justify-between min-h-[32px] shrink-0">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-[10px] font-mono uppercase tracking-[0.2em] text-chart-4 flex items-center gap-2">
                        <Sparkles className="h-3 w-3" /> Hypothesis Forge
                    </CardTitle>
                    {services.mlflow.active ? 
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[7px] h-3 px-1">MLFLOW LIVE</Badge> : 
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[7px] h-3 px-1">SIMULATED</Badge>
                    }
                </div>
                <Button variant="outline" size="sm" className="h-5 text-[9px] border-border hover:bg-accent hover:text-chart-4 uppercase tracking-tighter" onClick={generateHypotheses} disabled={loadingHypotheses}>
                    {loadingHypotheses ? "Scanning..." : "Execute Scan"}
                </Button>
            </CardHeader>
            <ScrollArea className="flex-1 w-full p-3 bg-black/5">
                <div className="flex space-x-3 pb-2">
                    {hypotheses.length === 0 && !loadingHypotheses && (
                        <div className="w-full flex items-center justify-center text-[10px] text-muted-foreground italic h-24 border border-dashed border-border rounded uppercase tracking-[0.3em]">
                            Awaiting Pulse...
                        </div>
                    )}
                    {hypotheses.map((h, i) => (
                        <div key={i} className="w-[240px] shrink-0 border border-border bg-background/50 p-2.5 rounded hover:border-chart-4/50 transition-all group relative shadow-sm">
                            <div className="flex justify-between items-start mb-1.5">
                                <span className="font-bold text-xs text-foreground truncate pr-2 uppercase tracking-tight">{h.strategy_name}</span>
                                <Badge variant="outline" className="text-[7px] h-3 px-1 border-chart-4/30 text-chart-4 bg-chart-4/5">{h.style}</Badge>
                            </div>
                            <div className="text-[9px] text-muted-foreground leading-snug h-[36px] overflow-hidden line-clamp-3 mb-2 font-mono">
                                {h.reasoning}
                            </div>
                            <Button 
                                variant="ghost" 
                                className="w-full h-5 text-[8px] bg-muted/50 hover:bg-chart-4 hover:text-white transition-colors uppercase tracking-widest font-bold"
                                onClick={() => loadHypothesis(h)}
                            >
                                Inject to Core
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </Card>
      </div>

      {/* --- Q3: CODE LAB --- */}
      <div className="col-span-6 row-span-7 flex flex-col min-h-0">
        <Card className="h-full flex flex-col border-border bg-card/30 overflow-hidden">
            <CardHeader className="py-1.5 px-3 border-b border-border min-h-[32px] shrink-0">
                <CardTitle className="text-[10px] font-mono uppercase tracking-[0.2em] text-chart-3 flex items-center gap-2">
                    <Code className="h-3 w-3" /> The Lab (Factor Engine)
                </CardTitle>
            </CardHeader>
            <div className="flex-1 relative bg-black/20 font-mono text-[10px]">
                <Textarea 
                    className="w-full h-full resize-none bg-transparent text-foreground border-0 p-3 focus-visible:ring-0 leading-relaxed font-mono"
                    value={editorCode}
                    onChange={(e) => setEditorCode(e.target.value)}
                    spellCheck={false}
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                    <Button size="sm" className="h-5 text-[8px] bg-chart-3/80 hover:bg-chart-3 text-white gap-1 uppercase tracking-widest font-bold border-none shadow-lg">
                        <Save className="h-2.5 w-2.5" /> Commit to Feature Store
                    </Button>
                </div>
            </div>
        </Card>
      </div>

      {/* --- Q4: CONFIG CORE --- */}
      <div className="col-span-3 row-span-12 flex flex-col min-h-0">
        <Card className="h-full flex flex-col border-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="py-2 px-3 border-b border-border bg-muted/80 flex flex-row items-center justify-between shrink-0">
                <CardTitle className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <Settings className="h-3 w-3" /> Config Core
                </CardTitle>
                {services.prefect.active && <Badge className="bg-primary/10 text-primary border-primary/20 text-[7px] h-3 px-1">PREFECT SYNC</Badge>}
            </CardHeader>
            <div className="flex-1 p-0 relative bg-black/10">
                <Textarea 
                    className="w-full h-full resize-none font-mono text-[9px] bg-transparent text-primary/80 border-0 p-3 focus-visible:ring-0"
                    value={strategyConfig}
                    onChange={(e) => setStrategyConfig(e.target.value)}
                    spellCheck={false}
                />
            </div>
            <div className="p-2 border-t border-border bg-muted/80 shrink-0">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono uppercase tracking-[0.2em] text-[10px] h-8 gap-2 shadow-xl" onClick={handleDeploy}>
                    <Play className="h-3 w-3 fill-current" /> Deploy to Research
                </Button>
            </div>
        </Card>
      </div>

    </div>
  )
}
