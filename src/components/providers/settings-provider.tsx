"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

interface UserSettings {
  preferredMarkets: string[]
  showOnlyPreferred: boolean
  defaultCurrency: string
}

interface SettingsContextType {
  settings: UserSettings
  updateSettings: (newSettings: Partial<UserSettings>) => void
}

const defaultSettings: UserSettings = {
  preferredMarkets: ["United States"],
  showOnlyPreferred: true,
  defaultCurrency: "USD"
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => {
    // Initial value during SSR or before mount
    if (typeof window === "undefined") return defaultSettings
    
    const saved = localStorage.getItem("qs_user_settings")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error("Failed to load settings", e)
      }
    }
    return defaultSettings
  })
  
  useEffect(() => {
    // Standard effect
  }, [])

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem("qs_user_settings", JSON.stringify(updated))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
