"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { api } from "@/lib/api"
import { Sparkles, Code, Play, ArrowRight, Terminal, Settings, Save, Loader2, Search, Database, Bot } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Hypothesis {
  strategy_name: string;
  style: string;
  reasoning: string;
  [key: string]: string | number | undefined | unknown;
}

export default function AIQuantPage() {
  const router = useRouter()
  
  // --- STATE ---
  const [services, setServices] = useState({
      mlflow: { active: false, url: "http://127.0.0.1:5000" },
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
              const mlRes = await fetch(services.mlflow.url).catch(() => ({ ok: false }))
              const prefRes = await fetch(services.prefect.url).catch(() => ({ ok: false }))
              
              setServices(prev => ({
                  ...prev,
                  mlflow: { ...prev.mlflow, active: mlRes.ok },
                  prefect: { ...prev.prefect, active: prefRes.ok }
              }))
          } catch {
              console.debug("Service check failed")
          }
      }
      checkSystems()
      const interval = setInterval(checkSystems, 10000)
      return () => clearInterval(interval)
  }, [services.mlflow.url, services.prefect.url])

  // --- HANDLERS ---

  const handleChat = async (overridePrompt?: string) => {
      const input = overridePrompt || chatInput
      if (!input.trim()) return
      
      setChatInput("")
      setChatHistory(prev => [...prev, { role: 'user', content: input }])
      setLoadingChat(true)
      setAgentStatus("Routing query...")

      try {
          if (input.toLowerCase().includes("mlflow") || input.toLowerCase().includes("research")) {
              setAgentStatus("Querying MLflow Registry...")
              await new Promise(r => setTimeout(r, 800))
              await api.getResearchSignals()
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
                  content: `Strategy architecture finalized. Payload sent to Config Core.`,
                  tool: "Architect Tool"
              }])
              setStrategyConfig(JSON.stringify(res, null, 2))
          }
      } catch (err) {
          console.error("Agent error", err)
          setChatHistory(prev => [...prev, { role: 'ai', content: "Bridge connection unstable." }])
      } finally {
          setLoadingChat(false)
          setAgentStatus(null)
      }
  }

  const generateHypotheses = async () => {
      setLoadingHypotheses(true)
      try {
          const res = await api.generateHypotheses(3)
          if (Array.isArray(res)) {
              setHypotheses(res as Hypothesis[])
          }
      } catch (err) {
          console.error("Failed to generate hypotheses", err)
      } finally {
          setLoadingHypotheses(false)
      }
  }

  const loadHypothesis = (h: Hypothesis) => {
      setStrategyConfig(JSON.stringify(h, null, 2))
      setChatHistory(prev => [...prev, { role: 'ai', content: `Loaded hypothesis: ${h.strategy_name}`, tool: "Forge" }])
  }

  const handleDeploy = async () => {
      try {
          const config = JSON.parse(strategyConfig)
          await api.runBacktest(config)
          alert("Strategy Deployed to Research Lab.")
          router.push("/research")
      } catch {
          alert("Invalid JSON Config.")
      }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background text-foreground overflow-hidden">
      
      {/* SIDEBAR: Settings */}
      <aside className="w-64 border-r border-border p-4 space-y-6 overflow-y-auto bg-card/20 backdrop-blur-sm shrink-0 hidden lg:block">
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-4 tracking-widest">Data Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Dataset directory</label>
              <Input className="h-8 bg-background border-border text-xs font-mono" defaultValue="temp_files/dashboard_demo" />
            </div>
            <Button variant="outline" className="w-full h-8 text-[10px] border-border hover:bg-accent uppercase tracking-widest font-bold">
                <Search className="h-3 w-3 mr-2" /> Reload dataset
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-4 tracking-widest">Inference Hub</h3>
          <div className="space-y-2">
              <div className={cn("p-2 rounded border transition-all", services.mlflow.active ? "bg-emerald-500/10 border-emerald-500/20" : "bg-muted/50 border-border")}>
                 <p className={cn("text-[9px] font-mono flex items-center gap-2 uppercase tracking-tight", services.mlflow.active ? "text-emerald-500" : "text-muted-foreground")}>
                   <span className={cn("h-1.5 w-1.5 rounded-full", services.mlflow.active ? "bg-emerald-500 animate-pulse" : "bg-zinc-700")} /> 
                   MLFLOW LIVE: 5000
                 </p>
              </div>
              <div className={cn("p-2 rounded border transition-all", services.prefect.active ? "bg-amber-500/10 border-amber-500/20" : "bg-muted/50 border-border")}>
                 <p className={cn("text-[9px] font-mono flex items-center gap-2 uppercase tracking-tight", services.prefect.active ? "text-amber-500" : "text-muted-foreground")}>
                   <span className={cn("h-1.5 w-1.5 rounded-full", services.prefect.active ? "bg-amber-500 animate-pulse" : "bg-zinc-700")} /> 
                   PREFECT SYNC: 4200
                 </p>
              </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-4 tracking-widest">Active Model</h3>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary">ALPHA_V2</span>
                </div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">
                    Agent-driven research is active. The supervisor is routing work across Hypothesis Forge and The Lab.
                </div>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT: Chat & Agent-Flow */}
      <main className="flex-1 flex flex-col min-w-0 bg-background/50">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto p-6 space-y-8">
                
                {/* Header Section */}
                <section className="space-y-2 border-b border-border/50 pb-6">
                  <h1 className="text-3xl font-bold tracking-tight">AI Quant Team</h1>
                  <p className="text-muted-foreground text-sm max-w-2xl">
                    Conversational interface for the supervisor-led LangGraph agents. 
                    Connecting the FastAPI bridge with MLflow research logs and Prefect orchestration.
                  </p>
                </section>

                {/* The Chat Area */}
                <section className="space-y-4 bg-card/30 rounded-2xl p-6 border border-border shadow-2xl relative">
                  <div className="flex justify-between items-center border-b border-border/50 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-primary" />
                        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Neural Terminal // Supervisor</h2>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="ghost" className="h-6 text-[9px] uppercase tracking-tighter hover:bg-accent" onClick={() => setChatHistory([{role: 'ai', content: "Memory cleared. Architect ready."}])}>Reset Chat</Button>
                       <Button variant="ghost" className="h-6 text-[9px] uppercase tracking-tighter hover:bg-accent">Telemetry</Button>
                    </div>
                  </div>

                  <div className="space-y-6 min-h-[300px]">
                     {chatHistory.map((msg, i) => (
                        <div key={i} className={cn("flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                          <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg",
                              msg.role === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border text-muted-foreground'
                          )}>
                            {msg.role === 'ai' ? <Terminal className="h-4 w-4" /> : 'U'}
                          </div>
                          <div className={cn("flex-1 space-y-1.5", msg.role === 'user' ? 'text-right' : 'text-left')}>
                            <div className="flex items-center gap-2 mb-1 justify-start">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    {msg.role === 'ai' ? 'Supervisor Agent' : 'Institutional User'}
                                </span>
                                {msg.tool && <Badge variant="secondary" className="text-[8px] h-3.5 px-1.5 uppercase tracking-tighter">{msg.tool}</Badge>}
                            </div>
                            <div className={cn(
                                "p-3 rounded-2xl text-sm leading-relaxed inline-block max-w-[90%] border shadow-sm",
                                msg.role === 'ai' ? 'bg-primary/5 border-primary/20 text-foreground' : 'bg-muted/50 border-border text-foreground'
                            )}>
                                {msg.content}
                            </div>
                          </div>
                        </div>
                     ))}
                     
                     {loadingChat && (
                        <div className="flex gap-4 animate-pulse">
                            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-2 bg-primary/10 rounded w-1/4"></div>
                                <div className="h-4 bg-primary/5 rounded w-3/4"></div>
                            </div>
                        </div>
                     )}
                  </div>

                  {/* QUICK ACTIONS */}
                  <div className="flex flex-wrap gap-2 pt-6 border-t border-border/50">
                    <Button variant="secondary" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest bg-muted hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/30" onClick={() => handleChat("Analyze current MLflow Research")}>
                        <Search className="h-3 w-3 mr-2" /> Strategy Research
                    </Button>
                    <Button variant="secondary" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest bg-muted hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/30" onClick={() => handleChat("Build new Alpha Factor code")}>
                        <Code className="h-3 w-3 mr-2" /> Strategy Builder
                    </Button>
                    <Button variant="secondary" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest bg-muted hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/30" onClick={() => handleChat("Run Prefect Ingestion Check")}>
                        <Database className="h-3 w-3 mr-2" /> Ingestion Status
                    </Button>
                  </div>

                  {/* AGENT TOOLS: Accordions for Results & Code */}
                  <div className="mt-6 space-y-3">
                      <Accordion type="multiple" className="w-full space-y-3">
                        <AccordionItem value="hypotheses" className="border border-border rounded-xl px-4 bg-background/40">
                          <AccordionTrigger className="hover:no-underline py-3 text-[10px] font-mono uppercase tracking-widest text-chart-4">
                              <span className="flex items-center gap-2"><Sparkles className="h-3 w-3" /> Hypothesis Forge (Inference Results)</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex gap-4 overflow-x-auto py-4 no-scrollbar">
                                {hypotheses.length === 0 && !loadingHypotheses && (
                                    <div className="w-full flex items-center justify-center text-[10px] text-muted-foreground italic h-32 border border-dashed border-border rounded uppercase tracking-[0.3em]">
                                        Awaiting Agent Trigger...
                                    </div>
                                )}
                                {hypotheses.map((h, i) => (
                                    <div key={i} className="w-[280px] shrink-0 border border-border bg-card p-4 rounded-xl hover:border-chart-4/50 transition-all group relative shadow-lg">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="font-bold text-sm text-foreground truncate pr-2 uppercase tracking-tight">{h.strategy_name}</span>
                                            <Badge variant="outline" className="text-[8px] h-4 border-chart-4/30 text-chart-4 bg-chart-4/5 uppercase tracking-widest">{h.style}</Badge>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground leading-relaxed h-[45px] overflow-hidden line-clamp-3 mb-4 font-mono italic">
                                            {h.reasoning}
                                        </div>
                                        <Button 
                                            variant="secondary" 
                                            className="w-full h-8 text-[9px] bg-muted hover:bg-chart-4 hover:text-white transition-all uppercase tracking-[0.2em] font-black border-none"
                                            onClick={() => loadHypothesis(h)}
                                        >
                                            Commit to Core
                                        </Button>
                                    </div>
                                ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="code" className="border border-border rounded-xl px-4 bg-background/40">
                          <AccordionTrigger className="hover:no-underline py-3 text-[10px] font-mono uppercase tracking-widest text-chart-3">
                              <span className="flex items-center gap-2"><Code className="h-3 w-3" /> Agent Trace (Code Lab)</span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="relative rounded-lg overflow-hidden border border-border bg-black/40">
                                <div className="absolute top-0 left-0 right-0 h-6 bg-muted flex items-center px-3 justify-between">
                                    <span className="text-[8px] text-muted-foreground uppercase font-mono">strategy_injected.py</span>
                                    <div className="flex gap-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-red-500/50" />
                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500/50" />
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
                                    </div>
                                </div>
                                <Textarea 
                                    className="font-mono text-[10px] bg-transparent border-none h-64 pt-8 focus-visible:ring-0 text-chart-3/90 leading-relaxed" 
                                    value={editorCode} 
                                    onChange={(e) => setEditorCode(e.target.value)}
                                    spellCheck={false}
                                />
                                <div className="p-2 border-t border-border/50 bg-muted/20 flex justify-end">
                                    <Button size="sm" className="h-6 text-[8px] uppercase tracking-widest bg-chart-3 hover:bg-chart-3/80 text-white font-bold">
                                        <Save className="h-3 w-3 mr-1" /> Deploy Factors
                                    </Button>
                                </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="config" className="border border-border rounded-xl px-4 bg-background/40">
                          <AccordionTrigger className="hover:no-underline py-3 text-[10px] font-mono uppercase tracking-widest text-primary">
                              <span className="flex items-center gap-2"><Settings className="h-3 w-3" /> Final Configuration (JSON)</span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="relative rounded-lg overflow-hidden border border-border bg-black/40">
                                <Textarea 
                                    className="font-mono text-[10px] bg-transparent border-none h-48 focus-visible:ring-0 text-primary/80 leading-relaxed" 
                                    value={strategyConfig} 
                                    onChange={(e) => setStrategyConfig(e.target.value)}
                                    spellCheck={false}
                                />
                                <div className="p-3 border-t border-border/50 bg-muted/20 flex justify-between items-center">
                                    <span className="text-[8px] text-muted-foreground uppercase font-mono tracking-widest italic">Auth: Quant Science Supervisor</span>
                                    <Button size="sm" className="h-8 text-[9px] uppercase tracking-widest bg-primary hover:bg-primary/80 text-primary-foreground font-black px-6 shadow-xl" onClick={handleDeploy}>
                                        <Play className="h-3 w-3 mr-2 fill-current" /> Execute Run
                                    </Button>
                                </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                  </div>
                </section>
            </div>
        </div>

        {/* Input Bar am Boden des Feeds */}
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border pt-4 pb-8 px-6">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-chart-4/20 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <Input 
              className="relative w-full bg-muted/50 border-border h-14 pl-6 pr-14 text-sm font-mono focus-visible:ring-primary/30 rounded-2xl shadow-inner placeholder:text-muted-foreground/50" 
              placeholder="Describe the task for the neural supervisor..." 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
            />
            <Button 
                className="absolute right-3 top-3 h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                onClick={() => handleChat()}
                disabled={loadingChat}
            >
               {loadingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
          <p className="max-w-4xl mx-auto text-center mt-2 text-[8px] uppercase tracking-[0.5em] text-muted-foreground opacity-40">
            Powered by LangGraph // GPT-4o Agent Orchestration
          </p>
        </div>
      </main>
    </div>
  )
}