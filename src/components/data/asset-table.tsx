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
  
  export interface Asset {
      ticker: string;
      name?: string;
      sector?: string;
      price?: string | number;
      updated?: string;
      status?: string;
      quantity?: number; // Added for positions view
      avg_cost?: number; // Added for positions view
  }

  interface AssetTableProps {
      assets?: Asset[];
      title?: string;
  }

  export function AssetTable({ assets = [], title = "Asset Universe" }: AssetTableProps) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Ticker</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Price / Cost</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">No data available</TableCell>
                  </TableRow>
              ) : (
                  assets.map((asset) => (
                    <TableRow key={asset.ticker} className="font-mono text-xs md:text-sm">
                      <TableCell className="font-bold text-primary">{asset.ticker}</TableCell>
                      <TableCell className="font-sans">
                          <div>{asset.name || asset.ticker}</div>
                          <div className="text-xs text-muted-foreground">{asset.sector}</div>
                      </TableCell>
                      <TableCell className="text-right">
                          <div>${Number(asset.price || 0).toFixed(2)}</div>
                          {asset.avg_cost && <div className="text-xs text-muted-foreground">Avg: ${asset.avg_cost.toFixed(2)}</div>}
                      </TableCell>
                      <TableCell className="text-right">{asset.quantity || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                            {asset.status || "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }
