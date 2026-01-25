"use client"

import { useEffect, useState } from "react"
import { ConsoleStream } from "@/components/live/console-stream"
import { OrderTicket } from "@/components/live/order-ticket"
import { AssetTable, Asset } from "@/components/data/asset-table"
import { RiskGauge } from "@/components/live/risk-gauge"
import { api } from "@/lib/api"

export default function LiveOpsPage() {
  const [positions, setPositions] = useState<Asset[]>([])
  const [liveStatus, setLiveStatus] = useState<any>(null)

  useEffect(() => {
      const fetchData = async () => {
          try {
              // 1. Positions
              const data = await api.getPortfolio()
              const assets: Asset[] = data.map((p: any) => ({
                  ticker: p.symbol,
                  name: p.contract?.symbol || p.symbol,
                  sector: p.asset_class || "Equity",
                  price: p.current_price,
                  quantity: p.quantity,
                  avg_cost: p.avg_cost,
                  status: "OPEN"
              }))
              setPositions(assets)

              // 2. Status / Risk
              const status = await api.getLiveStatus()
              setLiveStatus(status)

          } catch (e) {
              console.error("Failed to fetch live data", e)
          }
      }

      fetchData()
      const interval = setInterval(fetchData, 3000) // Fast polling for "Live" feel
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

        {/* Right: Controls & Risk */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <div className="h-48">
                <RiskGauge var95={liveStatus?.portfolio_var_95_usd} portfolioValue={liveStatus?.net_liquidation} />
            </div>
            <div className="flex-1">
                <OrderTicket />
            </div>
        </div>
      </div>
    </div>
  )
}
