"use client"

import { Card } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

interface MetricItemProps {
    label: string;
    value: string;
    subLabel?: string;
    subValue?: string;
    trend?: 'up' | 'down';
}

function MetricItem({ label, value, subLabel, subValue, trend }: MetricItemProps) {
    return (
        <div className="flex flex-col border-r border-zinc-800 last:border-0 px-6 py-2">
            <span className="text-[10px] uppercase tracking-tighter text-zinc-500 font-medium mb-1">{label}</span>
            <div className="flex items-baseline gap-2">
                <span className="text-xl font-mono font-bold text-zinc-100">{value}</span>
                {trend && (
                    trend === 'up' ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-rose-500" />
                )}
            </div>
            {subLabel && (
                <div className="flex items-center gap-1 mt-1">
                    <span className="text-[9px] text-zinc-600 uppercase">{subLabel}:</span>
                    <span className={`text-[9px] font-mono ${subValue?.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{subValue}</span>
                </div>
            )}
        </div>
    )
}

export function LivePerformanceHeader() {
  return (
    <Card className="bg-zinc-950 border-zinc-800 rounded-none border-x-0 border-t-0 shadow-none overflow-hidden">
        <div className="flex items-center divide-x divide-zinc-800 overflow-x-auto no-scrollbar py-1">
            <div className="flex-none min-w-[160px]">
                <MetricItem label="Total Return" value="+12.45%" subLabel="Bench" subValue="+8.12%" trend="up" />
            </div>
            <div className="flex-none min-w-[160px]">
                <MetricItem label="Benchmark" value="+8.12%" subLabel="Beta" subValue="0.45x" />
            </div>
            <div className="flex-none min-w-[160px]">
                <MetricItem label="CAGR (Est)" value="18.2%" subLabel="Alpha" subValue="+4.2%" trend="up" />
            </div>
            <div className="flex-none min-w-[160px]">
                <MetricItem label="Max Drawdown" value="-4.21%" subLabel="Rel" subValue="-0.8x" trend="down" />
            </div>
            <div className="flex-none min-w-[160px]">
                <MetricItem label="Daily Sharpe" value="2.14" subLabel="Target" subValue="> 1.5" />
            </div>
        </div>
    </Card>
  )
}
