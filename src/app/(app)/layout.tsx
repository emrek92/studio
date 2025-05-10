'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { AppLogo } from '@/components/AppLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserNav } from '@/components/UserNav';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { Menu, ChevronDown } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menüyü Aç</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0 w-[280px] sm:w-[300px]">
                <div className="p-4 border-b">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-lg font-semibold"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    <AppLogo />
                  </Link>
                </div>
                <nav className="flex-1 grid gap-2 p-4 text-base font-medium overflow-y-auto">
                  {siteConfig.sidebarNav.map((group, groupIndex) => (
                    <React.Fragment key={`mobile-group-${groupIndex}`}>
                      {group.title && (
                        <span className="px-1 py-2 text-sm font-semibold text-muted-foreground tracking-tight">
                          {group.title}
                        </span>
                      )}
                      {group.items.map((item) => (
                        <Link
                          key={`mobile-item-${item.href}`}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                            (pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')) &&
                              'bg-muted text-primary font-semibold',
                            item.disabled && 'cursor-not-allowed opacity-50'
                          )}
                          onClick={() => setIsSheetOpen(false)}
                          aria-disabled={item.disabled}
                          tabIndex={item.disabled ? -1 : undefined}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.title}
                        </Link>
                      ))}
                    </React.Fragment>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <div className="hidden md:flex">
             <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
                <AppLogo />
             </Link>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium"> {/* Removed mx-auto for left alignment near logo */}
          {siteConfig.sidebarNav.map((group, groupIndex) => (
            <React.Fragment key={`desktop-group-${groupIndex}`}>
              {group.title ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground">
                      {group.title}
                      <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {group.items.map((item) => (
                      <DropdownMenuItem key={item.href} asChild className="p-0">
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm',
                            (pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard'))
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent/50',
                            item.disabled && 'cursor-not-allowed opacity-50'
                          )}
                          aria-disabled={item.disabled}
                          tabIndex={item.disabled ? -1 : undefined}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.title}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                      (pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard'))
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      item.disabled && 'cursor-not-allowed opacity-50'
                    )}
                    aria-disabled={item.disabled}
                    tabIndex={item.disabled ? -1 : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                ))
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Spacer to push ThemeToggle and UserNav to the right */}
        <div className="flex-grow hidden md:flex"></div>


        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserNav />
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}
