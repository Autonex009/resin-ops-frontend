"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Gauge,
  ListChecks,
  ClipboardList,
  Upload,
  FlaskConical,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Overview", href: "/", icon: LayoutDashboard },
  { title: "Plan vs Actual", href: "/plan-vs-actual", icon: BarChart3 },
  { title: "Capacity Utilization", href: "/capacity", icon: Gauge },
  { title: "Batches", href: "/batches", icon: ListChecks },
  { title: "Commitments", href: "/commitments", icon: ClipboardList },
  { title: "Data Import", href: "/import", icon: Upload },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/12 text-primary">
            <FlaskConical className="size-4.5" />
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold">Resin Ops</span>
            <span className="text-xs text-muted-foreground">Thermax</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Planning</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
