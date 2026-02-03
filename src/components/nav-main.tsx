"use client"

import { type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  label,
  items,
}: {
  label?: string
  items: {
    title: string
    url: string
    icon?: Icon
    id?: string
    onClick?: () => void
  }[]
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
          {items.map((item) => (
            <SidebarMenuItem key={item.title} id={item.id}>
              <SidebarMenuButton 
                asChild 
                tooltip={item.title}
                isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
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
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
