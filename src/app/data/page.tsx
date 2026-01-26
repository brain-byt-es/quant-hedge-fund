"use client"

import { useEffect, useState } from "react"
import { ProcessMonitor } from "@/components/data/process-monitor"
import { AssetTable, Asset } from "@/components/data/asset-table"
import { LogViewer } from "@/components/status/log-viewer"
import { api } from "@/lib/api"

export default function DataHubPage() {
  const [assets, setAssets] = useState<Asset[]>([])

  useEffect(() => {
      const fetchData = async () => {
          try {
              // Fetch health data which is richer than just prices
              const res = await fetch("/api/data/health")
              const healthData = await res.json()
              
              if (!Array.isArray(healthData)) {
                  console.warn("Health data is not an array:", healthData)
                  setAssets([])
                  return
              }
              
              const mapped: Asset[] = healthData.map((row: any) => ({
                  ticker: row.symbol,
                  price: row.count, // Using 'price' field to show count for now (hacky, but effective for Health view)
                  sector: row.is_stale ? "STALE" : "HEALTHY",
                  updated: new Date(row.last_date).toLocaleDateString(),
                  status: row.is_stale ? "Warning" : "Active"
              }))
              setAssets(mapped)
          } catch (e) {
              console.error("Failed to load data health", e)
          }
      }
      fetchData()
      const interval = setInterval(fetchData, 10000)
      return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col gap-6 p-4 h-[calc(100vh-6rem)]">
      <div className="grid gap-6 md:grid-cols-3 h-full">
        {/* Left Column: Process Monitor & Logs */}
        <div className="md:col-span-1 flex flex-col gap-6 h-full">
          <div className="flex-none">
            <ProcessMonitor />
          </div>
          <div className="flex-1 min-h-0">
            <LogViewer />
          </div>
        </div>

        {/* Right Column: Data Health Table */}
        <div className="md:col-span-2 overflow-auto h-full border rounded-xl bg-card">
          <AssetTable assets={assets} title="Data Health & Coverage" />
        </div>
      </div>
    </div>
  )
}
