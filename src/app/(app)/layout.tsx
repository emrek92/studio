"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserNav } from "@/components/UserNav";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { siteConfig, type NavItemGroup } from "@/config/site";
import { cn } from "@/lib/utils";
import type React from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <AppLogo />
        </SidebarHeader>
        <Separator className="my-2" />
        <SidebarContent>
          {siteConfig.sidebarNav.map((group, index) => (
            <SidebarGroup key={index}>
              {group.title && (
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              )}
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href} passHref legacyBehavior>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')}
                        tooltip={item.title}
                        disabled={item.disabled}
                        className={cn(item.disabled && "cursor-not-allowed opacity-80")}
                      >
                        <a>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        {/* <SidebarFooter>
          Footer content if any
        </SidebarFooter> */}
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:pt-3">
          <SidebarTrigger className="md:hidden" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserNav />
          </div>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}
