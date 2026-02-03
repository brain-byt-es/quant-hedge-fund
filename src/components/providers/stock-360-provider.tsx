"use client"

import React, { createContext, useContext, useState } from "react"
import { Stock360Dialog } from "@/components/research/stock-360-dialog"

interface Stock360ContextType {
  openStock360: (symbol: string) => void
}

const Stock360Context = createContext<Stock360ContextType | undefined>(undefined)

export function Stock360Provider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)

  const openStock360 = (symbol: string) => {
    setSelectedSymbol(symbol)
    setIsOpen(true)
  }

  return (
    <Stock360Context.Provider value={{ openStock360 }}>
      {children}
      <Stock360Dialog 
        symbol={selectedSymbol} 
        open={isOpen} 
        onOpenChange={setIsOpen} 
      />
    </Stock360Context.Provider>
  )
}

export const useStock360 = () => {
  const context = useContext(Stock360Context)
  if (context === undefined) {
    throw new Error("useStock360 must be used within a Stock360Provider")
  }
  return context
}
