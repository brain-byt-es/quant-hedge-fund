"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface WatchlistItem {
  symbol: string
  price: number
  change_percent: number
  rvol: number
  float_shares: number
  vwap?: number
  day_high?: number
  catalyst?: string
  catalyst_url?: string
}

interface WatchlistContextType {
  watchlist: WatchlistItem[]
  addToWatchlist: (item: WatchlistItem) => void
  removeFromWatchlist: (symbol: string) => void
  updateWatchlistItem: (symbol: string, updates: Partial<WatchlistItem>) => void
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined)

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("quant_watchlist")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setTimeout(() => {
            setWatchlist(parsed)
        }, 0)
      } catch (e) {
        console.error("Failed to parse watchlist", e)
      }
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("quant_watchlist", JSON.stringify(watchlist))
  }, [watchlist])

  const addToWatchlist = (item: WatchlistItem) => {
    setWatchlist((prev) => {
      if (prev.find((i) => i.symbol === item.symbol)) return prev
      return [...prev, item]
    })
  }

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist((prev) => prev.filter((i) => i.symbol !== symbol))
  }

  const updateWatchlistItem = (symbol: string, updates: Partial<WatchlistItem>) => {
    setWatchlist((prev) => 
      prev.map((i) => i.symbol === symbol ? { ...i, ...updates } : i)
    )
  }

  return (
    <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, updateWatchlistItem }}>
      {children}
    </WatchlistContext.Provider>
  )
}

export const useWatchlist = () => {
  const context = useContext(WatchlistContext)
  if (context === undefined) {
    throw new Error("useWatchlist must be used within a WatchlistProvider")
  }
  return context
}
