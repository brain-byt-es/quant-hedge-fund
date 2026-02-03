"use client"

import { useEffect } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function OnboardingTour() {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        { 
          element: '#sidebar-operations', 
          popover: { 
            title: 'Mission Control', 
            description: 'This is your centralized command center. Monitor Net Liquidity, system health, and overall portfolio performance here.',
            side: "right",
            align: 'start'
          } 
        },
        { 
          element: '#sidebar-data-hub', 
          popover: { 
            title: 'Pillar #1: Data Hub', 
            description: 'Here beats the heart of your fund. Ingest raw financial data from SimFin or FMP and transform it into your high-performance DuckDB data lake.',
            side: "right",
            align: 'start'
          } 
        },
        { 
          element: '#sidebar-research-lab', 
          popover: { 
            title: 'Pillar #2: Research Lab', 
            description: 'Your strategy workshop. Create factors like the Piotroski F-Score, run backtests, and track your experiments with MLflow.',
            side: "right",
            align: 'start'
          } 
        },
        { 
          element: '#sidebar-tactical-scanner', 
          popover: { 
            title: 'Pillar #4: Tactical Scanner', 
            description: 'Your live-market radar. Find "Small-Cap Rockets" in real-time based on your specific momentum and supply criteria.',
            side: "right",
            align: 'start'
          } 
        },
        { 
          element: '#sidebar-live-ops', 
          popover: { 
            title: 'Pillar #3: One-Click Execution', 
            description: 'Monitor your live orders and portfolio state. Use the 360° Sheet to analyze any ticker and execute trades via Omega to IBKR.',
            side: "right",
            align: 'start'
          } 
        },
        { 
          popover: { 
            title: 'Pro Tip: Spotlight Search', 
            description: 'Press Cmd + K (or Ctrl + K) anywhere to search for tickers and jump straight into the Company 360 intelligence card.',
          } 
        },
      ]
    });

    driverObj.drive();
  }

  // Auto-start on first visit (using localStorage)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem("quant_tour_seen");
    if (!hasSeenTour) {
      // Small delay to ensure layout is ready
      setTimeout(startTour, 1500);
      localStorage.setItem("quant_tour_seen", "true");
    }
  }, []);

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={startTour} 
      className="h-8 w-8 text-muted-foreground hover:text-primary"
      title="Start System Tour"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  )
}
