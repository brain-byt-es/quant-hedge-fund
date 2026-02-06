"use client"

import * as React from "react"
import {
  IconDatabase,
  IconFlask,
  IconHelp,
  IconLayoutGrid,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconTarget,
  IconChartCandle,
  IconTornado,
  IconBox,
  IconWorld,
  IconUserSearch,
  IconCalendar,
  IconBuildingMonument,
  IconCurrencyBitcoin,
  IconBrain,
  type Icon,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  url: string
  icon: Icon
  id?: string
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
  onClick?: () => void
}

const data = {
  user: {
    name: "Henrik",
    email: "manager@quant-science.fund",
    avatar: "/avatars/user.jpg",
  },
  navQuantScience: [
    {
      title: "AI Quant Team",
      url: "/dashboard/ai-quant",
      icon: IconBrain,
    },
    {
      title: "Factor Lab",
      url: "/dashboard/research",
      icon: IconFlask,
      id: "sidebar-research-lab",
    },
    {
      title: "Backtest Arena",
      url: "/dashboard/signals",
      icon: IconTarget,
    },
    {
      title: "Portfolio Auditor",
      url: "/dashboard/governance",
      icon: IconShieldCheck,
    },
  ],
  navMarketHub: [
    {
      title: "Stocks",
      url: "#",
      icon: IconChartCandle,
      items: [
        { title: "By Industry", url: "/dashboard/market/industry" },
        { title: "By Country", url: "/dashboard/market/stocks/countries" },
        { title: "Market Heatmap", url: "/dashboard/market-heatmap" },
      ],
    },
    {
      title: "ETFs",
      url: "#",
      icon: IconBox,
      items: [
        { title: "By Provider", url: "/dashboard/market/etfs/providers" },
        { title: "By Category", url: "/dashboard/market/etfs/categories" },
        { title: "New Launches", url: "/dashboard/etf/new-launches" },
      ],
    },
    {
      title: "Crypto",
      url: "#",
      icon: IconCurrencyBitcoin,
      items: [
        { title: "All Coins", url: "/dashboard/market/crypto/all" },
        { title: "Defi", url: "/dashboard/market/crypto/defi" },
        { title: "Top Gainers", url: "/dashboard/market/crypto/gainers" },
      ],
    },
    {
      title: "Analyst",
      url: "#",
      icon: IconUserSearch,
      items: [
        { title: "Top Analysts", url: "/dashboard/analysts/top" },
        { title: "Top Analyst Stocks", url: "/dashboard/analysts/stocks" },
        { title: "Analyst Live Flow", url: "/dashboard/analysts/live" },
      ],
    },
    {
      title: "Calendar",
      url: "#",
      icon: IconCalendar,
      items: [
        { title: "Dividends Calendar", url: "/dashboard/dividends-calendar" },
        { title: "Earnings Calendar", url: "/dashboard/earnings-calendar" },
        { title: "IPO Calendar", url: "/dashboard/ipo-calendar" },
        { title: "Economic Calendar", url: "/dashboard/economic-calendar" },
      ],
    },
    {
      title: "Congress",
      url: "#",
      icon: IconBuildingMonument,
      items: [
        { title: "Congress Flow", url: "/dashboard/congress/flow" },
        { title: "All Politicians", url: "/dashboard/politicians" },
      ],
    },
    {
      title: "Flow Feed",
      url: "#",
      icon: IconTornado,
      items: [
        { title: "Market Flow", url: "/dashboard/market-flow" },
        { title: "News Flow", url: "/dashboard/news-flow" },
        { title: "Options Flow", url: "/dashboard/options-flow" },
        { title: "Unusual Order Flow", url: "/dashboard/unusual-order-flow" },
      ],
    },
    {
      title: "Screener",
      url: "#",
      icon: IconSearch,
      items: [
        { title: "Stock Screener", url: "/dashboard/stock-screener" },
        { title: "Options Screener", url: "/dashboard/options-screener" },
      ],
    },
    {
      title: "Tools",
      url: "#",
      icon: IconSettings,
      items: [
        { title: "Comparison Tool", url: "/dashboard/tools/comparison" },
        { title: "Options Calculator", url: "/dashboard/options-calculator" },
        { title: "POTUS Tracker", url: "/dashboard/tools/potus" },
        { title: "Insider Tracker", url: "/dashboard/insider-tracker" },
        { title: "Reddit Tracker", url: "/dashboard/reddit-tracker" },
        { title: "Hedge Funds", url: "/dashboard/hedge-funds" },
      ],
    },
    {
      title: "Market News",
      url: "/dashboard/news",
      icon: IconWorld,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
    {
      title: "Terminal Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Global Search",
      url: "#",
      icon: IconSearch,
      onClick: () => {
        window.dispatchEvent(new CustomEvent("toggle-command-menu"));
      }
    },
  ],
  navSystem: [
    {
      title: "Data Hub",
      url: "/dashboard/data",
      icon: IconDatabase,
      id: "sidebar-data-hub",
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <IconLayoutGrid className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-black uppercase italic tracking-tighter">Quant Science</span>
                  <span className="truncate text-[10px] text-muted-foreground uppercase font-mono">Institutional v2.1</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="custom-scrollbar overflow-x-hidden">
        {/* SECTION 1: QUANT SCIENCE */}
        <div className="group/quant relative px-2 pt-4">
            <NavMain label="Quant Science" items={data.navQuantScience as NavItem[]} />
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r opacity-0 group-hover/quant:opacity-100 transition-opacity" />
        </div>

        {/* SECTION 2: MARKET HUB (STOCKNEAR CLONE) */}
        <div className="group/market relative px-2 pt-4 border-t border-border/50">
            <NavMain label="Market Hub" items={data.navMarketHub as NavItem[]} />
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r opacity-0 group-hover/market:opacity-100 transition-opacity" />
        </div>

        <NavMain label="Infrastructure" items={data.navSystem.map(i => ({ title: i.title, url: i.url, icon: i.icon, id: i.id })) as NavItem[]} />
        <NavSecondary items={data.navSecondary as NavItem[]} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}