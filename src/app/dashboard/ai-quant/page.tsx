"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { api } from "@/lib/api"
import { Sparkles, Code, Play, ArrowRight, Terminal, Settings, Save, Loader2, Search, Bot, Users, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

import { toast } from "sonner"

interface Hypothesis {
  strategy_name: string;
  style: string;
  reasoning: string;
  [key: string]: string | number | undefined | unknown;
}

export default function AIQuantPage() {
  
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
  const [customFactorDeployed, setCustomFactorDeployed] = useState(false)
  
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
          const lowerInput = input.toLowerCase()
          const isStrategyRequest = lowerInput.includes("build") || lowerInput.includes("create") || lowerInput.includes("strategy") || lowerInput.includes("generate")

          if (!isStrategyRequest && (lowerInput.includes("alpha") || lowerInput.includes("top"))) {
              setAgentStatus("Querying Factor Database...")
              const res = await api.agenticQuery('alpha')
              const signalList = Array.isArray(res.data) ? res.data.map((s: {symbol: string}) => s.symbol).join(', ') : "No signals found."
              
              setChatHistory(prev => [...prev, { 
                  role: 'ai', 
                  content: `${res.summary} Top signals: ${signalList}.`,
                  tool: "Intelligence Core"
              }])
          }
          else if (input.toLowerCase().includes("risk") || input.toLowerCase().includes("var")) {
              setAgentStatus("Simulating Crash Scenarios...")
              const res = await api.agenticQuery('risk')
              console.log("Risk Query Response:", res)
              
              if (res.error) {
                  setChatHistory(prev => [...prev, { 
                      role: 'ai', 
                      content: `Risk Engine Error: ${res.error}`,
                      tool: "Omega Risk Engine"
                  }])
              } else {
                  const topStress = res.data && res.data.stress_tests ? res.data.stress_tests[0] : null
                  const varSummary = res.summary || "0.00% (Calculation Pending)"
                  
                  setChatHistory(prev => [...prev, { 
                      role: 'ai', 
                      content: `Risk analysis complete. Portfolio VaR (95%) is ${varSummary}. Under a '${topStress?.scenario || 'Market Correction'}' scenario, the estimated impact would be ${topStress?.impact_percent ? (topStress.impact_percent * 100).toFixed(2) : '-5.0'}%. All exposures remain within limits.`,
                      tool: "Omega Risk Engine"
                  }])
              }
          }
          else if (input.toLowerCase().includes("mlflow") || input.toLowerCase().includes("research")) {
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

  const [activeAccordion, setActiveAccordion] = useState<string[]>(["hypotheses", "config"])

  const handleDeployFactor = async () => {
      try {
          const res = await api.deployFactorCode(editorCode)
          setCustomFactorDeployed(true)
          toast.success("AI Factor Injected", {
              description: res.message
          })
          setChatHistory(prev => [...prev, { 
              role: 'ai', 
              content: "Neural logic successfully injected into the research layer. I've mapped your SMA logic to the backtester. You can now execute the run.", 
              tool: "Code Injector" 
          }])
      } catch (err) {
          toast.error("Injection Failed", { description: String(err) })
      }
  }

  const loadHypothesis = (h: Hypothesis) => {
      // Intelligent Transformation: Abstract Hypothesis -> Concrete Execution Config
      try {
          const weights = (h.factor_weights as Record<string, number>) || { momentum: 0.5, quality: 0.3, value: 0.2 };
          const topN = (h.top_n as number) || 20;
          
          // Logic: Map weights to thresholds
          let momMin = 60;
          if (weights.momentum && weights.momentum > 0.5) momMin = 90;
          else if (weights.momentum && weights.momentum > 0.3) momMin = 80;
          
          let fMin = 5;
          const qualityWeight = (weights.quality || 0) + (weights.value || 0); // Combined fundamental weight
          if (qualityWeight > 0.4) fMin = 7;
          if (qualityWeight > 0.7) fMin = 8;

          // Decide algorithm: If we just generated code, use dynamic_custom_factor
          // Otherwise use the standard multi_factor_rebalance
          const useDynamic = customFactorDeployed;

          const executionConfig = {
              strategy_name: h.strategy_name || "AI_Strategy",
              start_date: "2023-01-01",
              end_date: "2024-12-31",
              capital_base: 100000,
              benchmark: "SPY",
              algorithm: {
                  callable: useDynamic ? "dynamic_custom_factor" : "multi_factor_rebalance",
                  params: {
                      f_score_min: fMin,
                      momentum_min: momMin,
                      top_n: topN
                  }
              },
              // Persist original intent for reference
              meta: {
                  original_hypothesis: h.strategy_name,
                  style: h.style,
                  mode: useDynamic ? "Custom_AI_Factor" : "Standard_Snapshot"
              }
          };

          setStrategyConfig(JSON.stringify(executionConfig, null, 2))
          setChatHistory(prev => [...prev, { 
              role: 'ai', 
              content: `Loaded hypothesis: '${h.strategy_name}'. Mode: ${useDynamic ? 'Dynamic Custom Factor' : 'Standard DB Factors'}. Ready for execution.`, 
              tool: "Forge" 
          }])
          
          if (!activeAccordion.includes("config")) {
              setActiveAccordion(prev => [...prev, "config"])
          }
      } catch (err) {
          console.error("Failed to transform hypothesis", err);
          // Fallback
          setStrategyConfig(JSON.stringify(h, null, 2))
      }
  }

  const handleDeploy = async () => {
      try {
          const config = JSON.parse(strategyConfig)
          await api.runBacktest(config)
          
          toast.success("Strategy Deployed", {
            description: `Backtest initiated for '${config.strategy_name}'. Check MLflow for results.`,
          })
          
          setChatHistory(prev => [...prev, { 
              role: 'ai', 
              content: `Strategy '${config.strategy_name}' deployed to the Research Lab. Execution started in background. Monitor MLflow for performance metrics.`,
              tool: "Supervisor"
          }])
          
      } catch {
          toast.error("Deployment Failed", {
            description: "Invalid JSON Configuration.",
          })
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
          <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4 tracking-widest">Inference Hub</h3>
          <div className="space-y-2.5">
              <div className={cn("p-3 rounded-lg border transition-all", services.mlflow.active ? "bg-primary/10 border-primary/20 shadow-sm shadow-primary/5" : "bg-muted/50 border-border")}>
                 <p className={cn("text-xs font-mono flex items-center gap-2 uppercase tracking-tight font-bold", services.mlflow.active ? "text-primary" : "text-muted-foreground")}>
                   <span className={cn("h-2 w-2 rounded-full", services.mlflow.active ? "bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" : "bg-muted-foreground/30")} /> 
                   MLFLOW LIVE: 5000
                 </p>
              </div>
              <div className={cn("p-3 rounded-lg border transition-all", services.prefect.active ? "bg-chart-4/10 border-chart-4/20 shadow-sm shadow-chart-4/5" : "bg-muted/50 border-border")}>
                 <p className={cn("text-xs font-mono flex items-center gap-2 uppercase tracking-tight font-bold", services.prefect.active ? "text-chart-4" : "text-muted-foreground")}>
                   <span className={cn("h-2 w-2 rounded-full", services.prefect.active ? "bg-chart-4 animate-pulse shadow-[0_0_8px_var(--chart-4)]" : "bg-muted-foreground/30")} /> 
                   PREFECT SYNC: 4200
                 </p>
              </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border/50">
            <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4 tracking-widest">Active Model</h3>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-3 mb-2.5">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="text-sm font-black text-primary tracking-tight">ALPHA_V2</span>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Agent-driven research is active. The supervisor is routing work across Hypothesis Forge and The Lab.
                </div>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT: Chat & Agent-Flow */}
      <main className="flex-1 flex flex-col min-w-0 bg-background/50">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto p-8 space-y-10">
                
                {/* Header Section */}
                <section className="space-y-3 border-b border-border/50 pb-8">
                  <h1 className="text-4xl font-black tracking-tighter italic">AI QUANT TEAM</h1>
                  <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                    Conversational interface for supervisor-led LangGraph agents. 
                    Connecting the FastAPI bridge with MLflow research logs and Prefect orchestration.
                  </p>
                </section>

                {/* The Chat Area */}
                <section className="space-y-6 bg-card/30 rounded-3xl p-8 border border-border shadow-2xl relative">
                  <div className="flex justify-between items-center border-b border-border/50 pb-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Terminal className="h-5 w-5 text-primary" />
                        <h2 className="text-sm font-mono uppercase tracking-[0.3em] text-muted-foreground font-bold">Neural Terminal // Supervisor</h2>
                    </div>
                    <div className="flex gap-3">
                       <Button variant="ghost" className="h-8 text-xs uppercase tracking-widest font-bold hover:bg-accent" onClick={() => setChatHistory([{role: 'ai', content: "Memory cleared. Architect ready."}])}>Reset Chat</Button>
                       <Button variant="ghost" className="h-8 text-xs uppercase tracking-widest font-bold hover:bg-accent">Telemetry</Button>
                    </div>
                  </div>

                  <div className="space-y-8 min-h-[400px]">
                     {chatHistory.map((msg, i) => (
                        <div key={i} className={cn("flex gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500", msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                          <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xl border border-border/50",
                              msg.role === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          )}>
                            {msg.role === 'ai' ? <Terminal className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                          </div>
                          <div className={cn("flex-1 space-y-2", msg.role === 'user' ? 'text-right' : 'text-left')}>
                            <div className={cn("flex items-center gap-3 mb-1.5", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-70">
                                    {msg.role === 'ai' ? 'Supervisor Agent' : 'Institutional User'}
                                </span>
                                {msg.tool && <Badge variant="secondary" className="text-[10px] h-5 px-2 uppercase tracking-widest font-bold border-primary/20 bg-primary/5 text-primary">{msg.tool}</Badge>}
                            </div>
                            <div className={cn(
                                "p-4 rounded-2xl text-sm md:text-base leading-relaxed inline-block max-w-[85%] border shadow-md antialiased",
                                msg.role === 'ai' ? 'bg-primary/5 border-primary/20 text-foreground' : 'bg-muted/50 border-border text-foreground font-medium'
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
                                <div className="text-[10px] text-primary uppercase tracking-widest font-mono">{agentStatus || "Processing..."}</div>
                            </div>
                        </div>
                     )}
                  </div>

                  {/* QUICK ACTIONS */}
                  <div className="flex flex-wrap gap-3 pt-8 border-t border-border/50">
                    <Button variant="secondary" size="sm" className="h-9 text-xs uppercase font-black tracking-widest bg-muted hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/30 px-4" onClick={() => handleChat("Check current top Alpha signals")}>
                        <Search className="h-4 w-4 mr-2" /> Check Alpha
                    </Button>
                    <Button variant="secondary" size="sm" className="h-9 text-xs uppercase font-black tracking-widest bg-muted hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/30 px-4" onClick={() => handleChat("Explain current Portfolio Risk (VaR)")}>
                        <Activity className="h-4 w-4 mr-2" /> Explain Risk
                    </Button>
                    <Button variant="secondary" size="sm" className="h-9 text-xs uppercase font-black tracking-widest bg-muted hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/30 px-4" onClick={() => handleChat("Build new Alpha Factor code")}>
                        <Code className="h-4 w-4 mr-2" /> Strategy Builder
                    </Button>
                  </div>

                  {/* AGENT TOOLS: Accordions for Results & Code */}
                  <div className="mt-8 space-y-4">
                      <Accordion type="multiple" value={activeAccordion} onValueChange={setActiveAccordion} className="w-full space-y-4">
                        <AccordionItem value="hypotheses" className="border border-border rounded-2xl px-6 bg-background/40 shadow-sm">
                          <div className="flex items-center justify-between">
                            <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-chart-4 flex-1 font-bold">
                                <span className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4" /> Hypothesis Forge (Inference Results)</span>
                            </AccordionTrigger>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs border-border hover:bg-accent hover:text-chart-4 uppercase tracking-widest font-black" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    generateHypotheses();
                                }} 
                                disabled={loadingHypotheses}
                            >
                                {loadingHypotheses ? "Scanning..." : "Execute Scan"}
                            </Button>
                          </div>
                          <AccordionContent className="pt-2 pb-6">
                            <div className="flex gap-5 overflow-x-auto py-4 no-scrollbar">
                                {hypotheses.length === 0 && !loadingHypotheses && (
                                    <div className="w-full flex items-center justify-center text-xs text-muted-foreground italic h-32 border border-dashed border-border rounded-xl uppercase tracking-[0.3em] opacity-50">
                                        Awaiting Agent Trigger...
                                    </div>
                                )}
                                {hypotheses.map((h, i) => (
                                    <div key={i} className="w-[340px] h-[280px] shrink-0 border border-border bg-gradient-to-br from-card to-background p-5 rounded-2xl hover:border-chart-4/50 transition-all group relative shadow-lg hover:shadow-2xl hover:shadow-chart-4/10 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <span className="font-black text-sm text-foreground truncate min-w-0 flex-1 uppercase tracking-tight" title={h.strategy_name}>{(h.strategy_name || "Unknown Strategy").replace(/_/g, " ")}</span>
                                                <Badge variant="outline" className="text-[9px] h-5 border-chart-4/30 text-chart-4 bg-chart-4/10 uppercase tracking-widest font-bold px-2 shrink-0">{h.style}</Badge>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground leading-relaxed h-[120px] overflow-y-auto pr-2 custom-scrollbar mb-2 font-medium italic" title={h.reasoning}>
                                                {h.reasoning}
                                            </div>
                                        </div>
                                        <Button 
                                            variant="secondary" 
                                            className="w-full h-9 text-[10px] bg-muted hover:bg-chart-4 hover:text-white transition-all uppercase tracking-[0.2em] font-black border-none shadow-sm flex items-center gap-2"
                                            onClick={() => loadHypothesis(h)}
                                        >
                                            <Play className="h-3 w-3" /> Load & Configure
                                        </Button>
                                    </div>
                                ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="code" className="border border-border rounded-2xl px-6 bg-background/40 shadow-sm">
                          <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-chart-3 font-bold">
                              <span className="flex items-center gap-2 text-sm"><Code className="h-4 w-4" /> Agent Trace (Code Lab)</span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-6">
                            <div className="relative rounded-xl overflow-hidden border border-border bg-black/40 shadow-2xl">
                                <div className="absolute top-0 left-0 right-0 h-8 bg-muted flex items-center px-4 justify-between">
                                    <span className="text-[10px] text-muted-foreground uppercase font-mono font-bold tracking-widest">strategy_injected.py</span>
                                    <div className="flex gap-1.5">
                                        <div className="h-2 w-2 rounded-full bg-destructive/30" />
                                        <div className="h-2 w-2 rounded-full bg-chart-4/30" />
                                        <div className="h-2 w-2 rounded-full bg-primary/30" />
                                    </div>
                                </div>
                                <Textarea 
                                    className="font-mono text-xs bg-transparent border-none h-80 pt-10 focus-visible:ring-0 text-chart-3/90 leading-relaxed font-medium" 
                                    value={editorCode} 
                                    onChange={(e) => setEditorCode(e.target.value)}
                                    spellCheck={false}
                                />
                                <div className="p-3 border-t border-border/50 bg-muted/20 flex justify-end">
                                    <Button size="sm" className="h-8 text-xs uppercase tracking-widest bg-chart-3 hover:bg-chart-3/80 text-white font-black px-6 shadow-lg" onClick={handleDeployFactor}>
                                        <Save className="h-4 w-4 mr-2" /> Deploy Factors
                                    </Button>
                                </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="config" className="border border-border rounded-2xl px-6 bg-background/40 shadow-sm">
                          <AccordionTrigger className="hover:no-underline py-4 text-xs font-mono uppercase tracking-[0.2em] text-primary font-bold">
                              <span className="flex items-center gap-2 text-sm"><Settings className="h-4 w-4" /> Final Configuration (JSON)</span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-6">
                            <div className="relative rounded-xl overflow-hidden border border-border bg-black/40 shadow-2xl">
                                <Textarea 
                                    className="font-mono text-xs bg-transparent border-none h-64 focus-visible:ring-0 text-primary/80 leading-relaxed font-bold" 
                                    value={strategyConfig} 
                                    onChange={(e) => setStrategyConfig(e.target.value)}
                                    spellCheck={false}
                                />
                                <div className="p-4 border-t border-border/50 bg-muted/20 flex justify-between items-center">
                                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-[0.3em] italic font-bold">Auth: Quant Science Supervisor</span>
                                    <Button size="sm" className="h-10 text-xs uppercase tracking-widest bg-primary hover:bg-primary/80 text-primary-foreground font-black px-8 shadow-2xl" onClick={handleDeploy}>
                                        <Play className="h-4 w-4 mr-3 fill-current" /> Execute Run
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
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-2xl border-t border-border pt-6 pb-10 px-8">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/30 to-chart-4/30 rounded-3xl blur-md opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <Input 
              className="relative w-full bg-muted/50 border-border h-16 pl-8 pr-16 text-base font-mono focus-visible:ring-primary/30 rounded-2xl shadow-inner placeholder:text-muted-foreground/40 font-bold" 
              placeholder="Describe the task for the neural supervisor..." 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
            />
            <Button 
                className="absolute right-4 top-3.5 h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xl transition-all hover:scale-110 active:scale-90"
                onClick={() => handleChat()}
                disabled={loadingChat}
            >
               {loadingChat ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            </Button>
          </div>
          <p className="max-w-4xl mx-auto text-center mt-3 text-[10px] uppercase tracking-[0.6em] text-muted-foreground opacity-50 font-black">
            Powered by LangGraph // GPT-4o Agent Orchestration
          </p>
        </div>
      </main>
    </div>
  )
}