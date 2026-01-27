import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  subtext?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  className?: string
  isLive?: boolean
}

export function MetricCard({ title, value, subtext, trend, trendValue, className, isLive }: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {trend === "up" && <ArrowUpRight className="h-4 w-4 text-primary" />}
        {trend === "down" && <ArrowDownRight className="h-4 w-4 text-destructive" />}
        {trend === "neutral" && <Activity className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold font-mono tracking-tight", isLive && "animate-pulse text-primary shadow-[0_0_10px_var(--primary)]")}>{value}</div>
        {(subtext || trendValue) && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
            {trendValue && (
              <span className={cn(
                "font-black uppercase tracking-widest",
                trend === "up" && "text-primary",
                trend === "down" && "text-destructive"
              )}>
                {trendValue}
              </span>
            )}
            <span className="opacity-60">{subtext}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
