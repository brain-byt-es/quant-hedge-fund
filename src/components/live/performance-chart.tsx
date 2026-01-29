"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { useState } from "react"

// Initial State (Day 0)
const initialData = Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i}`,
    equity: 100000,
    benchmark: 100000,
    drawdown: 0
}));

export function LivePerformanceChart() {
  const [range, setRange] = useState("1M")
  // In a future update, we will fetch real equity curve history here
  const chartData = initialData;



  return (

    <Card className="h-full border-border bg-card flex flex-col">

        <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-border">

            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">

                Equity Curve & Drawdown

            </CardTitle>

            <div className="flex gap-1">

                {['1D', '1W', '1M', 'YTD', 'ALL'].map((r) => (

                    <Button 

                        key={r} 

                        variant="ghost" 

                        size="sm" 

                        className={`h-5 text-[10px] px-2 ${range === r ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}

                        onClick={() => setRange(r)}

                    >

                        {r}

                    </Button>

                ))}

            </div>

        </CardHeader>

        <CardContent className="flex-1 p-0 relative min-h-[300px]">

            {/* Main Equity Chart */}

            <div className="absolute inset-0 h-[80%]">

                <ResponsiveContainer width="100%" height="100%">

                    <AreaChart data={chartData}>

                        <defs>

                            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">

                                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3}/>

                                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0}/>

                            </linearGradient>

                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

                        <XAxis dataKey="date" hide />

                        <YAxis domain={['auto', 'auto']} orientation="right" tick={{fontSize: 10, fill: 'var(--muted-foreground)'}} axisLine={false} tickLine={false} />

                        <Tooltip 

                            contentStyle={{backgroundColor: 'var(--popover)', borderColor: 'var(--border)', fontSize: '12px'}}

                            itemStyle={{color: 'var(--popover-foreground)'}}

                        />

                        <Area type="monotone" dataKey="equity" stroke="var(--chart-2)" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />

                        <Area type="monotone" dataKey="benchmark" stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="4 4" fill="transparent" />

                    </AreaChart>

                </ResponsiveContainer>

            </div>



            {/* Drawdown Chart (Bottom 20%) */}

            <div className="absolute bottom-0 left-0 right-0 h-[20%] border-t border-border bg-muted/20">

                <ResponsiveContainer width="100%" height="100%">

                    <AreaChart data={chartData}>

                        <YAxis hide domain={[-20, 0]} />

                        <Area type="step" dataKey="drawdown" stroke="var(--destructive)" fill="var(--destructive)" fillOpacity={0.2} />

                    </AreaChart>

                </ResponsiveContainer>

            </div>

        </CardContent>

    </Card>

  )

}
