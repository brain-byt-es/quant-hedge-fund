"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function RollingReturnTable() {

  const data = [

      { period: "MTD", strat: "+2.4%", bench: "+1.1%", alpha: "+1.3%" },

      { period: "3M", strat: "+8.9%", bench: "+5.2%", alpha: "+3.7%" },

      { period: "6M", strat: "+15.2%", bench: "+9.8%", alpha: "+5.4%" },

      { period: "YTD", strat: "+24.5%", bench: "+12.3%", alpha: "+12.2%" },

      { period: "1Y", strat: "+32.1%", bench: "+18.5%", alpha: "+13.6%" },

  ]



  return (

    <Card className="h-full border-border bg-card">

        <CardHeader className="py-3 border-b border-border">

            <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Rolling Returns</CardTitle>

        </CardHeader>

        <CardContent className="p-0">

            <Table>

                <TableHeader>

                    <TableRow className="border-border hover:bg-transparent">

                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground">Period</TableHead>

                        <TableHead className="h-8 text-[10px] uppercase text-primary text-right">Strat</TableHead>

                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground text-right">Bench</TableHead>

                        <TableHead className="h-8 text-[10px] uppercase text-chart-3 text-right">Alpha</TableHead>

                    </TableRow>

                </TableHeader>

                <TableBody>

                    {data.map((row) => (

                        <TableRow key={row.period} className="border-border/50 hover:bg-accent/50">

                            <TableCell className="py-2 text-xs font-mono text-muted-foreground">{row.period}</TableCell>

                            <TableCell className="py-2 text-xs font-mono text-primary text-right">{row.strat}</TableCell>

                            <TableCell className="py-2 text-xs font-mono text-muted-foreground text-right">{row.bench}</TableCell>

                            <TableCell className="py-2 text-xs font-mono text-chart-3 text-right">{row.alpha}</TableCell>

                        </TableRow>

                    ))}

                </TableBody>

            </Table>

        </CardContent>

    </Card>

  )

}
