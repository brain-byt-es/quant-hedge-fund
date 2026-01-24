"use client"

import { useEffect, useState } from "react"
import { ProcessMonitor } from "@/components/data/process-monitor"
import { AssetTable, Asset } from "@/components/data/asset-table"
import { api } from "@/lib/api"

export default function DataHubPage() {
  const [assets, setAssets] = useState<Asset[]>([])

  useEffect(() => {
      const fetchData = async () => {
          try {
              const prices = await api.getLatestPrices(50) // Limit 50
              const mapped: Asset[] = prices.map((p: any) => ({
                  ticker: p.symbol,
                  price: p.close,
                  sector: "Unknown", // DB doesn't always have sector in prices table
                  updated: p.date,
                  status: "Cached"
              }))
              setAssets(mapped)
          } catch (e) {
              console.error("Failed to load data hub assets", e)
          }
      }
      fetchData()
  }, [])

  return (
    <div className="flex flex-col gap-6 p-4 h-full">
      <div className="grid gap-6 md:grid-cols-3 h-full">
        {/* Left Column: Process Monitor & Stats */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <ProcessMonitor />
        </div>

        {/* Right Column: Data Table */}
        <div className="md:col-span-2 overflow-auto">
          <AssetTable assets={assets} title="Ingested Market Data (DuckDB)" />
        </div>
      </div>
    </div>
  )
}
