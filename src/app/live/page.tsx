import { ConsoleStream } from "@/components/live/console-stream"
import { OrderTicket } from "@/components/live/order-ticket"
import { AssetTable } from "@/components/data/asset-table"

export default function LiveOpsPage() {
  return (
    <div className="h-[calc(100vh-6rem)] p-4">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Left: Active Positions / Market Data */}
        <div className="col-span-12 lg:col-span-8 grid grid-rows-2 gap-4">
            <div className="row-span-1 border rounded-xl overflow-hidden bg-card">
                 {/* Reusing AssetTable to show Active Positions (mock) */}
                 <AssetTable /> 
            </div>
            <div className="row-span-1">
                <ConsoleStream />
            </div>
        </div>

        {/* Right: Order Ticket & Quick Actions */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <OrderTicket />
        </div>
      </div>
    </div>
  )
}
