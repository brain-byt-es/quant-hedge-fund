"use client"

import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface InfoTooltipProps {
  content: string | React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconSize?: number;
}

export function InfoTooltip({ content, side = "top", className, iconSize = 14 }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("cursor-help text-muted-foreground hover:text-primary transition-colors inline-flex items-center", className)}>
            <Info size={iconSize} />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-[250px] text-xs font-medium leading-relaxed border-border/50 bg-popover text-popover-foreground shadow-xl">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
