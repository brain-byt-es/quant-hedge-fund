"use client"

import { useEffect, useState } from "react"
import { ConsoleStream } from "@/components/live/console-stream"
import { OrderTicket } from "@/components/live/order-ticket"
import { AssetTable, Asset } from "@/components/data/asset-table"
import { api } from "@/lib/api"

export default function LiveOpsPage() {
  const [positions, setPositions] = useState<Asset[]>([])

  useEffect(() => {
      const fetchPositions = async () => {
          try {
              const data = await api.getPortfolio()
              // Transform to Asset format
              const assets: Asset[] = data.map((p: any) => ({
                  ticker: p.symbol,
                  name: p.contract?.symbol || p.symbol, // Fallback
                  sector: p.asset_class || "Equity",
                  price: p.current_price,
                  quantity: p.quantity,
                  avg_cost: p.avg_cost,
                  status: "OPEN"
              }))
              setPositions(assets)
          } catch (e) {
              console.error("Failed to fetch positions", e)
          }
      }

      fetchPositions()
      const interval = setInterval(fetchPositions, 5000)
      return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-[calc(100vh-6rem)] p-4">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Left: Active Positions / Market Data */}
        <div className="col-span-12 lg:col-span-8 grid grid-rows-2 gap-4">
            <div className="row-span-1 border rounded-xl overflow-hidden bg-card">
                 <AssetTable assets={positions} title="Active Portfolio Positions" /> 
            </div>
            <div className="row-span-1">
                <ConsoleStream />
            </div>
        </div>

        {/* Right: Order Ticket & Quick Actions */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <OrderTicket />
        </div>
      </div>
    </div>
  )
}
