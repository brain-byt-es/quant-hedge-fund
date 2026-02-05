"use client"

import { type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

interface NavMainItem {
  title: string
  url: string
  icon?: Icon
  id?: string
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
  onClick?: () => void
}

export function NavMain({
  label,
  items,
}: {
  label?: string
  items: NavMainItem[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {label && (
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/50 px-2 mb-1">
            {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const hasSubItems = item.items && item.items.length > 0
            const isItemActive = pathname === item.url || pathname.startsWith(item.url + "/") || 
                                 (hasSubItems && item.items?.some(sub => pathname === sub.url))

            if (!hasSubItems) {
              return (
                <SidebarMenuItem key={item.title} id={item.id}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title}
                    isActive={isItemActive}
                    className="rounded-lg transition-all duration-200"
                    onClick={(e) => {
                        if (item.onClick) {
                            e.preventDefault();
                            item.onClick();
                        }
                    }}
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon className="!size-4" />}
                      <span className="font-bold tracking-tight">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            }

            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isItemActive || item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={isItemActive}>
                      {item.icon && <item.icon className="!size-4" />}
                      <span className="font-bold tracking-tight">{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                            <Link href={subItem.url}>
                              <span className="font-medium">{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
