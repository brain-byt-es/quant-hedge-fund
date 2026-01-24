import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const holdings = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corp",
    allocation: "12.4%",
    quantity: 450,
    pnl: "+$12,450.00",
    pnlPercent: "+2.5%",
    side: "Long",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp",
    allocation: "8.2%",
    quantity: 120,
    pnl: "+$3,210.50",
    pnlPercent: "+0.8%",
    side: "Long",
  },
  {
    symbol: "SPY",
    name: "SPDR S&P 500",
    allocation: "15.0%",
    quantity: 500,
    pnl: "-$1,200.00",
    pnlPercent: "-0.4%",
    side: "Hedge",
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices",
    allocation: "5.1%",
    quantity: 300,
    pnl: "+$4,500.20",
    pnlPercent: "+4.2%",
    side: "Long",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc",
    allocation: "4.8%",
    quantity: 200,
    pnl: "-$850.00",
    pnlPercent: "-1.2%",
    side: "Short",
  },
]

export function TopHoldings() {
  return (
    <Card className="col-span-4 lg:col-span-2 h-full">
      <CardHeader>
        <CardTitle>Top Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Alloc</TableHead>
              <TableHead className="text-right">Unrealized P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => (
              <TableRow key={holding.symbol}>
                <TableCell className="font-medium font-mono">
                    {holding.symbol}
                    <div className="text-xs text-muted-foreground font-sans">{holding.name}</div>
                </TableCell>
                <TableCell>
                    <Badge variant={holding.side === "Long" ? "default" : holding.side === "Hedge" ? "secondary" : "destructive"}>
                        {holding.side}
                    </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{holding.allocation}</TableCell>
                <TableCell className={`text-right font-mono ${holding.pnl.startsWith("+") ? "text-emerald-500" : "text-rose-500"}`}>
                    {holding.pnl}
                    <div className="text-xs">{holding.pnlPercent}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
