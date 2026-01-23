import { MetricCard } from "@/components/dashboard/metric-card"
import { PortfolioChart } from "@/components/dashboard/portfolio-chart"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total P&L"
          value="$1,245,392.00"
          trend="up"
          trendValue="+12.5%"
          subtext="vs last month"
        />
        <MetricCard
          title="Sharpe Ratio"
          value="2.84"
          trend="up"
          trendValue="+0.4"
          subtext="rolling 30d"
        />
        <MetricCard
          title="Alpha vs SPY"
          value="4.15%"
          trend="neutral"
          subtext="Year to Date"
        />
        <MetricCard
          title="Active Orders"
          value="12"
          trend="down"
          trendValue="-2"
          subtext="currently open"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PortfolioChart />
        <div className="col-span-4 lg:col-span-1 grid gap-4">
            {/* Placeholder for small widgets like Recent Activity or Market Status */}
            <MetricCard 
                title="Market Status" 
                value="OPEN" 
                subtext="NYSE / NASDAQ" 
                className="bg-sidebar/50"
            />
            <MetricCard 
                title="Buying Power" 
                value="$5,320,000" 
                subtext="Available Margin" 
                className="bg-sidebar/50"
            />
            <MetricCard 
                title="Risk Utilization" 
                value="42%" 
                subtext="Within Limits" 
                trend="up"
                trendValue="Stable"
                className="bg-sidebar/50"
            />
        </div>
      </div>
    </div>
  )
}
