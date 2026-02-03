"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Settings,
  User,
  Rocket,
  Activity,
  FlaskConical,
  Database,
  Bot,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useStock360 } from "@/components/providers/stock-360-provider"

export function GlobalCommandMenu() {
  const [open, setOpen] = React.useState(false)
  const { openStock360 } = useStock360()
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    const handleToggle = () => setOpen((prev) => !prev)

    document.addEventListener("keydown", down)
    window.addEventListener("toggle-command-menu", handleToggle)
    
    return () => {
      document.removeEventListener("keydown", down)
      window.removeEventListener("toggle-command-menu", handleToggle)
    }
  }, [])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a ticker (e.g. AAPL) or command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Stocks & Intelligence">
          <CommandItem onSelect={() => { setOpen(false); openStock360("AAPL") }}>
            <Search className="mr-2 h-4 w-4" />
            <span>Analyze AAPL</span>
            <CommandShortcut>⌘A</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); openStock360("PMN") }}>
            <Rocket className="mr-2 h-4 w-4 text-orange-500" />
            <span>ProMIS Neurosciences (PMN)</span>
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); openStock360("NVDA") }}>
            <Search className="mr-2 h-4 w-4" />
            <span>NVIDIA (NVDA)</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <Activity className="mr-2 h-4 w-4" />
            <span>Go to Mission Control</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/tactical"))}>
            <Rocket className="mr-2 h-4 w-4" />
            <span>Go to Tactical Scanner</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/research"))}>
            <FlaskConical className="mr-2 h-4 w-4" />
            <span>Go to Research Lab</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/data"))}>
            <Database className="mr-2 h-4 w-4" />
            <span>Go to Data Hub</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/ai-quant"))}>
            <Bot className="mr-2 h-4 w-4" />
            <span>Ask AI Quant Team</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => router.push("#"))}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("#"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
