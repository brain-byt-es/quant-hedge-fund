"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { Sparkles, Code, Play, ArrowRight, Terminal, Settings, Save } from "lucide-react"
import { useRouter } from "next/navigation"

interface Hypothesis {
  strategy_name: string;
  style: string;
  reasoning: string;
  [key: string]: unknown;
}

export default function AIQuantPage() {
  const router = useRouter()
  
  // --- STATE ---
  const [chatInput, setChatInput] = useState("")
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', content: string}[]>([
      {role: 'ai', content: "Systems online. Architect ready. Specify objective."}
  ])
  const [loadingChat, setLoadingChat] = useState(false)
  
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

  // --- HANDLERS ---

  // Q1: Chat
  const handleChat = async () => {
      if (!chatInput.trim()) return
      const userMsg = chatInput
      setChatInput("")
      setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
      setLoadingChat(true)

      try {
          if (userMsg.toLowerCase().includes("code") || userMsg.toLowerCase().includes("factor")) {
              const res = await api.generateFactorCode(userMsg)
              setChatHistory(prev => [...prev, { role: 'ai', content: `Code generated for: ${userMsg}` }])
              setEditorCode(res.code || "# Error generating code")
          } else {
              const res = await api.generateStrategyConfig(userMsg)
              setChatHistory(prev => [...prev, { role: 'ai', content: `Configuration built for: ${res.strategy_name}` }])
              setStrategyConfig(JSON.stringify(res, null, 2))
          }
      } catch (err) {
          console.error("Chat error", err)
          setChatHistory(prev => [...prev, { role: 'ai', content: "Command execution failed." }])
      } finally {
          setLoadingChat(false)
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
    <div className="grid grid-cols-12 grid-rows-12 gap-4 p-4 h-[calc(100vh-4rem)] bg-background text-foreground font-sans overflow-hidden">
      
      {/* --- Q1: THE ARCHITECT (Chat) --- */}
      <div className="col-span-3 row-span-12 flex flex-col">
        <Card className="h-full flex flex-col border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="py-3 border-b border-border bg-muted/80">
                <CardTitle className="text-xs font-mono uppercase tracking-widest text-primary flex items-center gap-2">
                    <Terminal className="h-3 w-3" /> The Architect
                </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 p-4 font-mono text-xs text-muted-foreground">
                <div className="space-y-4">
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] text-muted-foreground mb-1 uppercase">{msg.role}</span>
                            <div className={`p-2 rounded border max-w-[90%] ${msg.role === 'user' ? 'bg-accent border-border text-foreground' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loadingChat && <div className="text-primary animate-pulse">Processing...</div>}
                </div>
            </ScrollArea>
            <div className="p-3 border-t border-border bg-muted/80">
                <div className="flex gap-2">
                    <Input 
                        className="bg-background border-border text-xs font-mono focus-visible:ring-primary/50 h-8"
                        placeholder="Command..." 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleChat()}
                    />
                    <Button size="icon" className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleChat} disabled={loadingChat}>
                        <ArrowRight className="h-4 w-4"/>
                    </Button>
                </div>
            </div>
        </Card>
      </div>

      {/* --- Q2: HYPOTHESIS FORGE --- */}
      <div className="col-span-6 row-span-5 flex flex-col min-h-0">
        <Card className="h-full flex flex-col border-border bg-card/30">
            <CardHeader className="py-2 px-4 border-b border-border flex flex-row items-center justify-between min-h-[40px]">
                <CardTitle className="text-xs font-mono uppercase tracking-widest text-chart-4 flex items-center gap-2">
                    <Sparkles className="h-3 w-3" /> Hypothesis Forge
                </CardTitle>
                <Button variant="outline" size="sm" className="h-6 text-[10px] border-border hover:bg-accent hover:text-chart-4" onClick={generateHypotheses} disabled={loadingHypotheses}>
                    {loadingHypotheses ? "Scanning..." : "Auto-Generate"}
                </Button>
            </CardHeader>
            <ScrollArea className="flex-1 w-full whitespace-nowrap p-4">
                <div className="flex space-x-4">
                    {hypotheses.length === 0 && !loadingHypotheses && (
                        <div className="w-full flex items-center justify-center text-xs text-muted-foreground italic h-32 border border-dashed border-border rounded">
                            Awaiting Regime Scan...
                        </div>
                    )}
                    {hypotheses.map((h, i) => (
                        <div key={i} className="w-[280px] shrink-0 border border-border bg-background p-3 rounded hover:border-chart-4/50 transition-colors group relative">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-sm text-foreground truncate pr-2">{h.strategy_name}</span>
                                <Badge variant="outline" className="text-[10px] h-4 border-chart-4/30 text-chart-4 bg-chart-4/10">{h.style}</Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground whitespace-normal h-[40px] overflow-hidden line-clamp-3 mb-3">
                                {h.reasoning}
                            </div>
                            <Button 
                                variant="ghost" 
                                className="w-full h-6 text-[10px] bg-muted hover:bg-chart-4 hover:text-white transition-colors"
                                onClick={() => loadHypothesis(h)}
                            >
                                INJECT CONFIG
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </Card>
      </div>

      {/* --- Q3: CODE INJECTOR --- */}
      <div className="col-span-6 row-span-7 flex flex-col min-h-0">
        <Card className="h-full flex flex-col border-border bg-card/30">
            <CardHeader className="py-2 px-4 border-b border-border min-h-[40px]">
                <CardTitle className="text-xs font-mono uppercase tracking-widest text-chart-3 flex items-center gap-2">
                    <Code className="h-3 w-3" /> The Lab (Factor Engine)
                </CardTitle>
            </CardHeader>
            <div className="flex-1 relative bg-background font-mono text-xs">
                <Textarea 
                    className="w-full h-full resize-none bg-transparent text-foreground border-0 p-4 focus-visible:ring-0 leading-relaxed"
                    value={editorCode}
                    onChange={(e) => setEditorCode(e.target.value)}
                    spellCheck={false}
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                    <Button size="sm" className="h-6 text-[10px] bg-chart-3 hover:bg-chart-3/90 text-white gap-1">
                        <Save className="h-3 w-3" /> Save to Features
                    </Button>
                </div>
            </div>
        </Card>
      </div>

      {/* --- Q4: STRATEGY DEFINITION --- */}
      <div className="col-span-3 row-span-12 flex flex-col">
        <Card className="h-full flex flex-col border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="py-3 border-b border-border bg-muted/80">
                <CardTitle className="text-xs font-mono uppercase tracking-widest text-primary flex items-center gap-2">
                    <Settings className="h-3 w-3" /> Config Core
                </CardTitle>
            </CardHeader>
            <div className="flex-1 p-0 relative">
                <Textarea 
                    className="w-full h-full resize-none font-mono text-[10px] bg-background text-primary border-0 p-4 focus-visible:ring-0"
                    value={strategyConfig}
                    onChange={(e) => setStrategyConfig(e.target.value)}
                    spellCheck={false}
                />
            </div>
            <div className="p-4 border-t border-border bg-muted/80">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono uppercase tracking-wider text-xs h-10 gap-2" onClick={handleDeploy}>
                    <Play className="h-3 w-3" /> Deploy to Research
                </Button>
            </div>
        </Card>
      </div>

    </div>
  )
}
