"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, History, Landmark } from "lucide-react"

interface AuditEntry {
  approved_at: string;
  stage: string;
  human_rationale: string;
  approved_by: string;
  [key: string]: unknown;
}

export function StrategyGovernance({ initialData }: { initialData?: any }) {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [rationale, setRationale] = useState(
      initialData?.strategy_name ? `Authorized promotion of '${initialData.strategy_name}' (Run: ${initialData.run_id}). Sharpe: ${initialData.sharpe}, Return: ${initialData.return}%.` : ""
  )
  const [stage, setStage] = useState("PAPER")
  const [loading, setLoading] = useState(false)

  const fetchAuditTrail = async () => {
    try {
      const res = await fetch("/api/governance/audit-trail")
      const data = await res.json()
      setAuditLog(data as AuditEntry[])
    } catch (err) {
      console.error("Failed to fetch audit trail", err)
    }
  }

  const handleApprove = async () => {
    if (!rationale) {
        alert("Please provide a rationale for approval.")
        return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/governance/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_hash: "manual-" + Date.now(),
          strategy_name: "Active Model",
          stage: stage,
          rationale: rationale
        })
      })
      if (res.ok) {
          setRationale("")
          fetchAuditTrail()
          alert("Strategy deployment approved.")
      }
    } catch (err) {
      console.error("Approval failed", err)
      alert("Approval failed.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditTrail()
  }, [])

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Left: Approval Form */}
      <Card className="col-span-12 lg:col-span-4 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" /> Deployment Approval
          </CardTitle>
          <CardDescription>Authorize strategy transitions to live stages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Target Activation Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHADOW">SHADOW (No Execution)</SelectItem>
                <SelectItem value="PAPER">PAPER (Simulation)</SelectItem>
                <SelectItem value="CANARY">CANARY (Small Capital)</SelectItem>
                <SelectItem value="FULL">FULL (Production)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Human Rationale (Required)</Label>
            <Textarea 
                placeholder="Explain why this strategy is ready for the next stage..." 
                className="h-32 bg-background"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
            />
          </div>
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest h-10" onClick={handleApprove} disabled={loading}>
            {loading ? "Logging..." : "Log & Approve Strategy"}
          </Button>
        </CardContent>
      </Card>

      {/* Right: Audit Trail */}
      <Card className="col-span-12 lg:col-span-8 border-border bg-card/20">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
                <History className="h-5 w-5 text-muted-foreground" /> Immutable Audit Trail
            </CardTitle>
            <CardDescription className="text-xs">History of all approved model changes.</CardDescription>
          </div>
          <Landmark className="h-8 w-8 text-muted-foreground/20" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="px-4">Timestamp</TableHead>
                <TableHead className="px-4">Stage</TableHead>
                <TableHead className="px-4">Rationale</TableHead>
                <TableHead className="px-4">Approved By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-32 italic">
                        No approvals recorded in audit trail.
                    </TableCell>
                  </TableRow>
              ) : (
                  auditLog.map((log, i) => (
                    <TableRow key={i} className="text-xs hover:bg-muted/50 border-border/30">
                      <TableCell className="font-mono text-muted-foreground px-4">
                        {new Date(log.approved_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4">
                        <Badge variant={log.stage === "FULL" ? "default" : "secondary"} className="text-[10px] h-5">
                            {log.stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate px-4">{log.human_rationale}</TableCell>
                      <TableCell className="font-bold text-primary px-4">{log.approved_by}</TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
