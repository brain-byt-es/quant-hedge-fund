"use client"

import * as React from "react"
import {
  IconActivity,
  IconRobot,
  IconDatabase,
  IconFlask,
  IconHelp,
  IconLayoutGrid,
  IconRocket,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconTarget,
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
  navTacticalOps: [
    {
      title: "Rocket Scanner",
      url: "/dashboard/tactical",
      icon: IconRocket,
      id: "sidebar-tactical-scanner",
    },
    {
      title: "Live Execution",
      url: "/dashboard/live",
      icon: IconActivity,
      id: "sidebar-live-ops",
    },
    {
      title: "AI Quant Team",
      url: "/dashboard/ai-quant",
      icon: IconRobot,
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
      onClick: () => {
        window.dispatchEvent(new CustomEvent("toggle-command-menu"));
      }
    },
  ],
  navSystem: [
    {
      name: "Data Hub",
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
      <SidebarContent>
        {/* SECTION 1: QUANT SCIENCE */}
        <div className="group/quant relative px-2 pt-4">
            <NavMain label="Quant Science" items={data.navQuantScience as NavItem[]} />
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r opacity-0 group-hover/quant:opacity-100 transition-opacity" />
        </div>

        {/* SECTION 2: TACTICAL OPS */}
        <div className="group/tactical relative px-2 pt-4 border-t border-border/50">
            <NavMain label="Tactical Ops" items={data.navTacticalOps as NavItem[]} />
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-r opacity-0 group-hover/tactical:opacity-100 transition-opacity" />
        </div>

        <NavMain label="Infrastructure" items={data.navSystem.map(i => ({ title: i.name, url: i.url, icon: i.icon, id: i.id })) as NavItem[]} />
        <NavSecondary items={data.navSecondary as NavItem[]} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
