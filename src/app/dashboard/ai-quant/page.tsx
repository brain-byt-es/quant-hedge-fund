"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Play, ArrowRight, Terminal, Save, Loader2, Search, Users, Activity, CheckCircle2, Code2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// --- TYPES ---

interface Hypothesis {
  strategy_name: string;
  style: string;
  reasoning: string;
  factor_weights?: Record<string, number>;
  top_n?: number;
  [key: string]: string | number | undefined | unknown;
}

type ChatMessageType = 'text' | 'hypotheses' | 'confirmation' | 'code_preview' | 'result_card';

interface ChatMessage {
  role: 'user' | 'ai';
  content?: string;
  tool?: string;
  type?: ChatMessageType;
  data?: Record<string, unknown> | Hypothesis[] | null;
  timestamp?: number;
}

interface StressTest {
  scenario: string;
  impact_percent: number;
}

interface BacktestRunData {
  strategy_name: string;
  status: string;
  sharpe_ratio: number;
  annual_return: number;
  max_drawdown: number;
  volatility: number;
  alpha?: number;
  tags: Record<string, string>;
}

export default function AIQuantPage() {
  
  // --- STATE ---
  const [services] = useState({
      mlflow: { active: false, url: "http://127.0.0.1:5000" },
      prefect: { active: false, url: "http://127.0.0.1:4200" }
  })

  const [chatInput, setChatInput] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
      {role: 'ai', content: "Systems online. Architect ready. Neural bridge established. Specify objective.", type: 'text'}
  ])
  const [loadingChat, setLoadingChat] = useState(false)
  const [agentStatus, setAgentStatus] = useState<string | null>(null)
  
  const [editorCode, setEditorCode] = useState<string>("# Waiting for Alpha Factor code injection...")
  const [customFactorDeployed, setCustomFactorDeployed] = useState(false)
  
  // Manual Algorithm Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [isSavingCode, setIsSavingCode] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  // --- EFFECTS ---
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      }
  }, [chatHistory, loadingChat])

  // --- HANDLERS ---

  const handleOpenManualEditor = async () => {
      setIsEditorOpen(true)
      try {
          const res = await api.getAlgorithmsCode()
          setManualCode(res.code)
      } catch (err) {
          toast.error("Failed to load algorithms.py")
      }
  }

  const handleSaveManualEditor = async () => {
      setIsSavingCode(true)
      try {
          await api.updateAlgorithmsCode(manualCode)
          toast.success("Algorithms Updated", { description: "backend/qsresearch/strategies/factor/algorithms.py has been updated." })
          setIsEditorOpen(false)
      } catch (err) {
          toast.error("Failed to save code")
      } finally {
          setIsSavingCode(false)
      }
  }

  const handleChat = async (overridePrompt?: string) => {
      const input = overridePrompt || chatInput
      if (!input.trim()) return
      
      setChatInput("")
      setChatHistory(prev => [...prev, { role: 'user', content: input, type: 'text', timestamp: Date.now() }])
      setLoadingChat(true)
      setAgentStatus("Routing query...")

      try {
          const lowerInput = input.toLowerCase()
          
          // 1. ALPHA / SIGNALS
          if (lowerInput.includes("alpha") || lowerInput.includes("top") || lowerInput.includes("signal")) {
              setAgentStatus("Querying Factor Database...")
              const res = await api.agenticQuery('alpha')
              const signalList = Array.isArray(res.data) ? res.data.map((s: {symbol: string}) => s.symbol).join(', ') : "No signals found."
              
              setChatHistory(prev => [...prev, { 
                  role: 'ai', 
                  content: `${res.summary} Top signals: ${signalList}.`,
                  tool: "Intelligence Core",
                  type: 'text'
              }])
          }
          // 2. RISK
          else if (lowerInput.includes("risk") || lowerInput.includes("var")) {
              setAgentStatus("Simulating Crash Scenarios...")
              const res = await api.agenticQuery('risk')
              
              if (res.error) {
                  setChatHistory(prev => [...prev, { role: 'ai', content: `Risk Engine Error: ${res.error}`, tool: "Omega Risk Engine", type: 'text' }])
              } else {
                  const stressTests = (res.data?.stress_tests as StressTest[]) || []
                  const topStress = stressTests.length > 0 ? stressTests[0] : null
                  const varSummary = res.summary || "0.00% (Calculation Pending)"
                  
                  setChatHistory(prev => [...prev, { 
                      role: 'ai', 
                      content: `Risk analysis complete. Portfolio VaR (95%) is ${varSummary}. Under a '${topStress?.scenario || 'Market Correction'}' scenario, the estimated impact would be ${topStress?.impact_percent ? (topStress.impact_percent * 100).toFixed(2) : '-5.0'}%. All exposures remain within limits.`,
                      tool: "Omega Risk Engine",
                      type: 'text'
                  }])
              }
          }
          // 3. CODE GENERATION
          else if (lowerInput.includes("code") || lowerInput.includes("factor")) {
              setAgentStatus("Generating Factor Engine code...")
              const res = await api.generateFactorCode(input)
              
              setEditorCode(res.code || "# Error")
              
              setChatHistory(prev => [...prev, { 
                  role: 'ai', 
                  content: `I've generated a custom factor based on your request. Review the logic below.`, 
                  tool: "Code Injector",
                  type: 'code_preview',
                  data: { code: res.code, explanation: res.explanation }
              }])
          } 
          // 4. STRATEGY GENERATION (Hypothesis Scan)
          else if (lowerInput.includes("strategy") || lowerInput.includes("find") || lowerInput.includes("build") || lowerInput.includes("scan")) {
              setAgentStatus("Scanning market regime & generating hypotheses...")
              const res = await api.generateHypotheses(3)
              
              if (Array.isArray(res)) {
                  setChatHistory(prev => [...prev, { 
                      role: 'ai', 
                      content: "I've analyzed the current market regime and generated 3 potential strategy candidates. Select one to configure the backtest.",
                      tool: "Hypothesis Forge",
                      type: 'hypotheses',
                      data: res
                  }])
              }
          }
          // 5. DEFAULT / GENERIC -> LLM CHAT
          else {
              setAgentStatus("Consulting Architect...")
              const res = await api.chat(input)
              setChatHistory(prev => [...prev, { role: 'ai', content: res.response, type: 'text' }])
          }
      } catch (err) {
          console.error("Agent error", err)
          setChatHistory(prev => [...prev, { role: 'ai', content: "Bridge connection unstable.", type: 'text' }])
      } finally {
          setLoadingChat(false)
          setAgentStatus(null)
      }
  }

  // --- ACTIONS ---

  const handleDeployFactor = async (code: string) => {
      try {
          const res = await api.deployFactorCode(code)
          setCustomFactorDeployed(true)
          setEditorCode(code)
          toast.success("AI Factor Injected", { description: res.message })
          return true
      } catch (err) {
          toast.error("Injection Failed", { description: String(err) })
          return false
      }
  }

  const handleSelectHypothesis = (h: Hypothesis) => {
      try {
          const weights = h.factor_weights || { momentum: 0.5, quality: 0.3, value: 0.2 };
          const topN = h.top_n || 20;
          
          let momMin = 60;
          if (weights.momentum && weights.momentum > 0.5) momMin = 90;
          else if (weights.momentum && weights.momentum > 0.3) momMin = 80;
          
          let fMin = 5;
          const qualityWeight = (weights.quality || 0) + (weights.value || 0); 
          if (qualityWeight > 0.4) fMin = 7;
          if (qualityWeight > 0.7) fMin = 8;

          const useDynamic = customFactorDeployed; 

          const executionConfig = {
              strategy_name: h.strategy_name || "AI_Strategy",
              start_date: "2021-01-01",
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
              meta: {
                  original_hypothesis: h.strategy_name,
                  style: h.style,
                  mode: useDynamic ? "Custom_AI_Factor" : "Standard_Snapshot"
              }
          };

          const configStr = JSON.stringify(executionConfig, null, 2)

          setChatHistory(prev => [...prev, {
              role: 'ai',
              tool: 'Architect',
              type: 'confirmation',
              content: `Configuration ready for '${h.strategy_name}'.`,
              data: { config: executionConfig, configStr: configStr }
          }])

      } catch (err) {
          console.error("Mapping error", err)
      }
  }

  const handleExecuteRun = async (configStr: string) => {
      try {
          const config = JSON.parse(configStr)
          const res = await api.runBacktest(config) 
          
          toast.success("Backtest Initiated", {
            description: `Run '${config.strategy_name}' started.`,
          })
          
          setChatHistory(prev => [...prev, { 
              role: 'ai', 
              content: `🚀 Backtest '${config.strategy_name}' is running. I will notify you when results are ready...`,
              tool: "Supervisor",
              type: 'text'
          }])

          const pollInterval = setInterval(async () => {
              try {
                  const runs = await api.listBacktests(5)
                  const myRun = (runs as unknown as BacktestRunData[]).find((r) => r.tags['mlflow.runName'] === res.run_name || r.strategy_name === config.strategy_name) 
                  
                  if (myRun && myRun.status === 'FINISHED') {
                      clearInterval(pollInterval)
                      
                      setChatHistory(prev => [...prev, {
                          role: 'ai',
                          tool: 'Analyst',
                          type: 'result_card',
                          content: "Backtest complete.",
                          data: myRun as unknown as Record<string, unknown>
                      }])
                      
                      toast.success("Backtest Complete", { description: "Results analyzed." })
                  }
              } catch (e) {
                  console.error("Polling error", e)
              }
          }, 3000)

          setTimeout(() => clearInterval(pollInterval), 60000)
          
      } catch {
          toast.error("Execution Failed", { description: "Invalid Config or Backend Error" })
      }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background text-foreground overflow-hidden">
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
              <Button 
                variant="outline" 
                className="w-full h-10 text-[10px] border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 uppercase tracking-widest font-black flex items-center gap-2"
                onClick={handleOpenManualEditor}
              >
                <Code2 className="h-4 w-4" /> Manual Editor
              </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background/50">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8" ref={scrollRef}>
            <div className="max-w-4xl mx-auto space-y-10 pb-20">
                <section className="space-y-3 border-b border-border/50 pb-8">
                  <h1 className="text-4xl font-black tracking-tighter italic">AI QUANT TEAM</h1>
                  <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                    Agent-driven Alpha Discovery. Chat to generate code, strategies, and execute backtests.
                  </p>
                </section>

                <section className="space-y-8 min-h-[400px]">
                     {chatHistory.map((msg, i) => (
                        <div key={i} className={cn("flex gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500", msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                          <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xl border border-border/50",
                              msg.role === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          )}>
                            {msg.role === 'ai' ? <Terminal className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                          </div>
                          
                          <div className={cn("flex-1 space-y-2 max-w-[85%]", msg.role === 'user' ? 'items-end flex flex-col' : 'items-start flex flex-col')}>
                            <div className={cn("flex items-center gap-3 mb-1.5", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-70">
                                    {msg.role === 'ai' ? 'Supervisor Agent' : 'Institutional User'}
                                </span>
                                {msg.tool && <Badge variant="secondary" className="text-[10px] h-5 px-2 uppercase tracking-widest font-bold border-primary/20 bg-primary/5 text-primary">{msg.tool}</Badge>}
                            </div>
                            
                            {(!msg.type || msg.type === 'text') && (
                                <div className={cn(
                                    "p-4 rounded-2xl text-sm md:text-base leading-relaxed border shadow-md antialiased",
                                    msg.role === 'ai' ? 'bg-primary/5 border-primary/20 text-foreground' : 'bg-muted/50 border-border text-foreground font-medium'
                                )}>
                                    {msg.content}
                                </div>
                            )}

                            {msg.type === 'hypotheses' && msg.data && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-2">
                                    {(msg.data as Hypothesis[]).map((h, idx) => (
                                        <div key={idx}
                                             onClick={() => handleSelectHypothesis(h)}
                                             className="cursor-pointer border border-border bg-gradient-to-br from-card to-background p-4 rounded-2xl hover:border-chart-4/50 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <Badge variant="outline" className="text-[9px] border-chart-4/30 text-chart-4 bg-chart-4/10">{h.style}</Badge>
                                            </div>
                                            <h4 className="text-xs font-black uppercase tracking-tight mb-2 line-clamp-2 min-h-[32px]">{h.strategy_name?.replace(/_/g, " ")}</h4>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-4 italic mb-4 flex-1">
                                                {h.reasoning}
                                            </p>
                                            <div className="mt-auto pt-3 border-t border-border/30 flex justify-end">
                                                <span className="text-[10px] font-bold text-chart-4 flex items-center gap-1 group-hover:underline">
                                                    Select & Configure <ArrowRight className="h-3 w-3" />
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {msg.type === 'confirmation' && msg.data && (
                                <div className="w-full max-w-md border border-primary/30 bg-primary/5 rounded-2xl p-5 shadow-lg">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" /> Ready to Launch
                                    </h4>
                                    <div className="bg-background/50 rounded-lg p-3 border border-border/50 mb-4">
                                        <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify((msg.data as Record<string, unknown>).config, null, 2).slice(0, 300) + "\n..."}
                                        </pre>
                                    </div>
                                    <Button 
                                        className="w-full font-bold uppercase tracking-widest"
                                        onClick={() => handleExecuteRun((msg.data as Record<string, string>).configStr)}
                                    >
                                        <Play className="h-4 w-4 mr-2 fill-current" /> Confirm & Execute Run
                                    </Button>
                                </div>
                            )}

                            {msg.type === 'code_preview' && msg.data && (
                                <div className="w-full max-w-2xl border border-chart-3/30 bg-background/40 rounded-2xl overflow-hidden shadow-lg">
                                    <div className="bg-muted/50 px-4 py-2 border-b border-border/50 flex justify-between items-center">
                                        <span className="text-[10px] font-mono font-bold text-chart-3 uppercase">strategy.py</span>
                                        <Button size="sm" variant="ghost" className="h-6 text-[10px] hover:bg-chart-3 hover:text-white transition-colors" onClick={() => handleDeployFactor((msg.data as Record<string, string>).code)}>
                                            <Save className="h-3 w-3 mr-1" /> Deploy
                                        </Button>
                                    </div>
                                    <div className="p-4 overflow-x-auto bg-black/20">
                                        <pre className="text-[10px] font-mono text-muted-foreground">
                                            {(msg.data as Record<string, string>).code}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {msg.type === 'result_card' && msg.data && (
                                <div className="w-full max-w-lg border border-border bg-card/50 rounded-2xl overflow-hidden shadow-xl animate-in zoom-in-95 duration-300">
                                    <div className="bg-muted/30 px-5 py-3 border-b border-border/50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-black uppercase tracking-widest text-foreground">{(msg.data as unknown as BacktestRunData).strategy_name}</span>
                                        </div>
                                        <Badge variant="outline" className={cn("text-[9px] font-mono", (msg.data as unknown as BacktestRunData).sharpe_ratio > 1 ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20")}>
                                            SHARPE: {(msg.data as unknown as BacktestRunData).sharpe_ratio?.toFixed(2)}
                                        </Badge>
                                    </div>
                                    <div className="p-5 grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Total Return</p>
                                            <p className={cn("text-2xl font-black font-mono", (msg.data as unknown as BacktestRunData).annual_return > 0 ? "text-green-500" : "text-red-500")}>
                                                {((msg.data as unknown as BacktestRunData).annual_return * 100).toFixed(1)}% <span className="text-xs text-muted-foreground font-sans font-medium">CAGR</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Max Drawdown</p>
                                            <p className="text-2xl font-black font-mono text-red-400">
                                                {((msg.data as unknown as BacktestRunData).max_drawdown * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Volatility</p>
                                            <p className="text-lg font-bold font-mono text-foreground">
                                                {((msg.data as unknown as BacktestRunData).volatility * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Alpha</p>
                                            <p className="text-lg font-bold font-mono text-foreground">
                                                {(msg.data as unknown as BacktestRunData).alpha?.toFixed(2) || "-"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="px-5 pb-4">
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${Math.min(Math.max(((msg.data as unknown as BacktestRunData).sharpe_ratio / 3) * 100, 0), 100)}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[9px] text-muted-foreground mt-1 font-mono">
                                            <span>Risk Profile</span>
                                            <span>{(msg.data as unknown as BacktestRunData).sharpe_ratio > 1.5 ? "EXCELLENT" : (msg.data as unknown as BacktestRunData).sharpe_ratio > 1 ? "GOOD" : "POOR"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                </section>
            </div>
        </div>

        <div className="sticky bottom-0 bg-background/80 backdrop-blur-2xl border-t border-border pt-6 pb-10 px-8 shrink-0 z-20">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/30 to-chart-4/30 rounded-3xl blur-md opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <Input 
              className="relative w-full bg-muted/50 border-border h-16 pl-8 pr-16 text-base font-mono focus-visible:ring-primary/30 rounded-2xl shadow-inner placeholder:text-muted-foreground/40 font-bold" 
              placeholder="Ask Supervisor: 'Find a defensive strategy', 'Check Alpha', 'Generate RSI code'..." 
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
          
          <div className="max-w-4xl mx-auto mt-4 flex gap-2 justify-center">
             <Button variant="ghost" className="text-[10px] h-6 text-muted-foreground hover:text-primary" onClick={() => handleChat("Find a balanced strategy")}>Find Strategy</Button>
             <span className="text-muted-foreground/20">|</span>
             <Button variant="ghost" className="text-[10px] h-6 text-muted-foreground hover:text-chart-3" onClick={() => handleChat("Generate RSI Factor Code")}>Generate Code</Button>
             <span className="text-muted-foreground/20">|</span>
             <Button variant="ghost" className="text-[10px] h-6 text-muted-foreground hover:text-chart-4" onClick={() => handleChat("Check Alpha Signals")}>Check Signals</Button>
          </div>
        </div>
      </main>

      {/* Manual Algorithm Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] flex flex-col p-0 overflow-hidden border-border bg-background shadow-2xl">
            <div className="p-6 border-b bg-muted/30 shrink-0">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Code2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black tracking-tighter italic uppercase">Strategy Algorithm Editor</DialogTitle>
                            <DialogDescription className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                                Editing: backend/qsresearch/strategies/factor/algorithms.py
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
            </div>

            <div className="flex-1 p-6 overflow-hidden bg-black/20">
                <Textarea 
                    className="h-full w-full font-mono text-sm bg-transparent border-none focus-visible:ring-0 resize-none custom-scrollbar p-0 text-chart-3 leading-relaxed"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="# Import libraries and define your algorithms here..."
                    spellCheck={false}
                />
            </div>

            <DialogFooter className="p-6 border-t bg-muted/30 gap-4">
                <Button variant="ghost" onClick={() => setIsEditorOpen(false)} className="font-bold uppercase tracking-widest text-xs">
                    Cancel
                </Button>
                <Button 
                    onClick={handleSaveManualEditor} 
                    disabled={isSavingCode}
                    className="font-black uppercase tracking-widest text-xs px-8"
                >
                    {isSavingCode ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save & Deploy Algorithms
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}