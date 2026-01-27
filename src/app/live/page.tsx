"use client"

import { useEffect, useState } from "react"
import { ConsoleStream } from "@/components/live/console-stream"
import { OrderTicket } from "@/components/live/order-ticket"
import { RiskGauge } from "@/components/live/risk-gauge"
import { LivePerformanceHeader } from "@/components/live/live-performance-header"
import { DeploymentMetadata } from "@/components/live/deployment-metadata"
import { LivePerformanceChart } from "@/components/live/performance-chart"
import { RollingReturnTable } from "@/components/live/rolling-return-table"
import { ActiveWeightsTable } from "@/components/live/active-weights-table"
import { api } from "@/lib/api"

interface LiveStatus {
  portfolio_var_95_usd?: number;
  net_liquidation?: number;
  [key: string]: unknown;
}

export default function LiveOpsPage() {
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null)

  useEffect(() => {
      const fetchData = async () => {
          try {
              const status = await api.getLiveStatus()
              setLiveStatus(status as LiveStatus)
          } catch (err) {
              console.error("Failed to fetch live data", err)
          }
      }

      fetchData()
      const interval = setInterval(fetchData, 5000)
      return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col bg-black min-h-screen text-zinc-300">
      
      {/* 1. Run Snapshot Header (Sticky-ish) */}
      <div className="sticky top-0 z-30">
        <LivePerformanceHeader />
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        
        {/* 2. Metadata Accordion */}
        <DeploymentMetadata />

        {/* 3. Performance Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-9 h-full min-h-[400px]">
                <LivePerformanceChart />
            </div>
            <div className="lg:col-span-3 h-full">
                <RollingReturnTable />
            </div>
        </div>

        {/* 4. Details Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Active Weights */}
            <div className="lg:col-span-7">
                <ActiveWeightsTable />
            </div>

            {/* Risk, Execution & Logs */}
            <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RiskGauge var95={liveStatus?.portfolio_var_95_usd} portfolioValue={liveStatus?.net_liquidation} />
                    <OrderTicket />
                </div>
                <div className="flex-1 min-h-[300px]">
                    <ConsoleStream />
                </div>
            </div>
        </div>

      </div>
    </div>
  )
}
