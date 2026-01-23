"use client"

import * as React from "react"
import {
  Home,
  Database,
  FlaskConical,
  Zap,
  Settings,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { toggleSidebar, state } = useSidebar()

  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Data Hub",
      url: "/data",
      icon: Database,
    },
    {
      title: "Research Lab",
      url: "/research",
      icon: FlaskConical,
    },
    {
      title: "Live Ops",
      url: "/live",
      icon: Zap,
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/50">
        <div className="flex items-center gap-2 font-bold text-xl text-primary px-2 w-full overflow-hidden whitespace-nowrap">
           <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
             <span className="text-lg">Q</span>
           </div>
           <span className="truncate group-data-[collapsible=icon]:hidden transition-all duration-300">
             Quant Science
           </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 gap-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                tooltip={item.title}
                size="lg"
                className="rounded-xl transition-all duration-200"
              >
                <Link href={item.url}>
                  <item.icon className="!size-5" />
                  <span className="font-medium text-base">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
           <SidebarMenuItem>
             <SidebarMenuButton tooltip="Settings" size="lg" className="rounded-xl">
               <Settings className="!size-5" />
               <span className="font-medium">Settings</span>
             </SidebarMenuButton>
           </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
