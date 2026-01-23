import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
  import { Badge } from "@/components/ui/badge"
  import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
  
  const assets = [
    { ticker: "AAPL", name: "Apple Inc.", sector: "Technology", price: "185.92", updated: "1 min ago", status: "Active" },
    { ticker: "MSFT", name: "Microsoft Corp.", sector: "Technology", price: "402.56", updated: "1 min ago", status: "Active" },
    { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Technology", price: "152.12", updated: "2 mins ago", status: "Active" },
    { ticker: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical", price: "172.34", updated: "5 mins ago", status: "Active" },
    { ticker: "NVDA", name: "NVIDIA Corp.", sector: "Technology", price: "721.33", updated: "Just now", status: "Active" },
    { ticker: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical", price: "198.20", updated: "10 mins ago", status: "Halting" },
    { ticker: "BRK.B", name: "Berkshire Hathaway", sector: "Financial", price: "398.20", updated: "15 mins ago", status: "Active" },
    { ticker: "META", name: "Meta Platforms", sector: "Technology", price: "468.20", updated: "2 mins ago", status: "Active" },
    { ticker: "LLY", name: "Eli Lilly & Co.", sector: "Healthcare", price: "720.50", updated: "8 mins ago", status: "Active" },
    { ticker: "V", name: "Visa Inc.", sector: "Financial", price: "278.40", updated: "12 mins ago", status: "Active" },
    { ticker: "XOM", name: "Exxon Mobil", sector: "Energy", price: "102.30", updated: "20 mins ago", status: "Active" },
    { ticker: "JPM", name: "JPMorgan Chase", sector: "Financial", price: "175.60", updated: "4 mins ago", status: "Active" },
  ]
  
  export function AssetTable() {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Asset Universe (S&P 500)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Ticker</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.ticker} className="font-mono text-xs md:text-sm">
                  <TableCell className="font-bold text-primary">{asset.ticker}</TableCell>
                  <TableCell className="font-sans">{asset.name}</TableCell>
                  <TableCell className="text-muted-foreground">{asset.sector}</TableCell>
                  <TableCell className="text-right">${asset.price}</TableCell>
                  <TableCell className="text-muted-foreground">{asset.updated}</TableCell>
                  <TableCell>
                    <Badge variant={asset.status === "Active" ? "outline" : "destructive"} className="text-xs">
                        {asset.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }
