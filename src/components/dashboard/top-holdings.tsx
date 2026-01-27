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

interface Position {
  symbol: string;
  quantity: number;
  market_value: number;
  unrealized_pnl: number;
  asset_class?: string;
}

interface TopHoldingsProps {
  positions: Position[];
}

export function TopHoldings({ positions = [] }: TopHoldingsProps) {
  // Sort by market value descending
  const sortedPositions = [...positions].sort((a, b) => Math.abs(b.market_value) - Math.abs(a.market_value)).slice(0, 10); // Show top 10

  return (
    <Card className="h-full min-h-[350px]">
      <CardHeader>
        <CardTitle>Active Positions (Live)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Unrealized P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPositions.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No active positions</TableCell>
                </TableRow>
            ) : (
                sortedPositions.map((pos) => {
                  const side = pos.quantity > 0 ? "Long" : "Short";
                  const pnlColor = pos.unrealized_pnl >= 0 ? "text-primary font-bold" : "text-destructive font-bold";
                  const pnlSign = pos.unrealized_pnl >= 0 ? "+" : "";
                  
                  return (
                  <TableRow key={pos.symbol}>
                    <TableCell className="font-medium font-mono">
                        {pos.symbol}
                        <div className="text-xs text-muted-foreground font-sans">{pos.asset_class || "STK"}</div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={side === "Long" ? "default" : "destructive"}>
                            {side}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">${Math.abs(pos.market_value).toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-mono ${pnlColor}`}>
                        {pnlSign}${pos.unrealized_pnl.toFixed(2)}
                    </TableCell>
                  </TableRow>
                )})
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
