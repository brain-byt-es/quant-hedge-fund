"use client"

import * as React from "react"
import {
  IconActivity,
  IconRobot,
  IconChartCandle,
  IconDashboard,
  IconDatabase,
  IconFlask,
  IconHelp,
  IconLayoutGrid,
  IconSearch,
  IconSettings,
  IconShieldCheck,
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

const data = {
  user: {
    name: "Henrik",
    email: "manager@quant-science.fund",
    avatar: "/avatars/user.jpg",
  },
  navOperations: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Live Ops",
      url: "/live",
      icon: IconActivity,
    },
    {
      title: "Governance",
      url: "/operations/governance",
      icon: IconShieldCheck,
    },
  ],
  navIntelligence: [
    {
      title: "Research Lab",
      url: "/research",
      icon: IconFlask,
    },
    {
      title: "AI Quant Team",
      url: "/ai-quant",
      icon: IconRobot,
    },
    {
      title: "Signal Terminal",
      url: "/research/signals",
      icon: IconChartCandle,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
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
    },
  ],
  navSystem: [
    {
      name: "Data Hub",
      url: "/data",
      icon: IconDatabase,
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
      <SidebarContent>
        <NavMain label="Operations" items={data.navOperations} />
        <NavMain label="Alpha Intelligence" items={data.navIntelligence} />
        <NavMain label="Infrastructure" items={data.navSystem.map(i => ({ title: i.name, url: i.url, icon: i.icon }))} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}