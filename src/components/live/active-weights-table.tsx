"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const Sparkline = ({ data, color = "var(--primary)" }: { data: number[], color?: string }) => {

    const min = Math.min(...data);

    const max = Math.max(...data);

    const range = max - min || 1;

    const width = 60;

    const height = 20;

    

    const points = data.map((d, i) => {

        const x = (i / (data.length - 1)) * width;

        const y = height - ((d - min) / range) * height;

        return `${x},${y}`;

    }).join(" ");



    return (

        <svg width={width} height={height} className="overflow-visible">

            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />

        </svg>

    )

}



export function ActiveWeightsTable() {

  const positions = [

      { rank: 1, symbol: "NVDA", signal: 2.4, weight: 8.5, ret12m: "+145%", vol: "32%", trend: [10, 12, 11, 14, 13, 16, 18, 17, 20] },

      { rank: 2, symbol: "MSFT", signal: 1.8, weight: 6.2, ret12m: "+55%", vol: "24%", trend: [20, 21, 20, 23, 24, 23, 26, 28, 27] },

      { rank: 3, symbol: "AAPL", signal: 1.2, weight: 5.8, ret12m: "+12%", vol: "18%", trend: [50, 48, 49, 51, 52, 50, 53, 54, 55] },

      { rank: 4, symbol: "AMZN", signal: 0.9, weight: 4.1, ret12m: "+28%", vol: "22%", trend: [100, 98, 95, 97, 102, 105, 103, 108, 110] },

      { rank: 5, symbol: "META", signal: 0.5, weight: 3.9, ret12m: "+85%", vol: "29%", trend: [10, 11, 10, 12, 15, 14, 18, 20, 25] },

  ]



  return (

    <Card className="h-full border-border bg-card">

        <CardHeader className="py-3 border-b border-border">

            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Active Weights (Top 5)</CardTitle>

        </CardHeader>

        <CardContent className="p-0">

            <Table>

                <TableHeader>

                    <TableRow className="border-border hover:bg-transparent">

                        <TableHead className="h-8 text-[9px] uppercase text-muted-foreground w-8">Rank</TableHead>

                        <TableHead className="h-8 text-[9px] uppercase text-muted-foreground">Symbol</TableHead>

                        <TableHead className="h-8 text-[9px] uppercase text-muted-foreground text-right">Z-Score</TableHead>

                        <TableHead className="h-8 text-[9px] uppercase text-muted-foreground text-right">Weight</TableHead>

                        <TableHead className="h-8 text-[9px] uppercase text-muted-foreground text-right">12M Ret</TableHead>

                        <TableHead className="h-8 text-[9px] uppercase text-muted-foreground text-right">Vol</TableHead>

                        <TableHead className="h-8 text-[9px] uppercase text-muted-foreground text-right">Trend</TableHead>

                    </TableRow>

                </TableHeader>

                <TableBody>

                    {positions.map((pos) => (

                        <TableRow key={pos.symbol} className="border-border/50 hover:bg-accent/50">

                            <TableCell className="py-2 text-xs font-mono text-muted-foreground">{pos.rank}</TableCell>

                            <TableCell className="py-2 text-xs font-mono font-bold text-foreground">

                                <div className="flex items-center gap-2">

                                    <div className="w-2 h-2 rounded-full bg-primary/20 border border-primary/50" />

                                    {pos.symbol}

                                </div>

                            </TableCell>

                            <TableCell className="py-2 text-xs font-mono text-chart-3 text-right">{pos.signal}</TableCell>

                            <TableCell className="py-2 text-xs font-mono text-foreground text-right">{pos.weight}%</TableCell>

                            <TableCell className="py-2 text-xs font-mono text-primary text-right">{pos.ret12m}</TableCell>

                            <TableCell className="py-2 text-xs font-mono text-muted-foreground text-right">{pos.vol}</TableCell>

                            <TableCell className="py-2 flex justify-end">

                                <Sparkline data={pos.trend} color={parseFloat(pos.ret12m) >= 0 ? "var(--primary)" : "var(--destructive)"} />

                            </TableCell>

                        </TableRow>

                    ))}

                </TableBody>

            </Table>

        </CardContent>

    </Card>

  )

}
