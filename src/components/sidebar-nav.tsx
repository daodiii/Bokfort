"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Building,
  BarChart3,
  Users2,
  Settings,
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState } from "react"

const navItems = [
  { href: "/dashboard", label: "Oversikt", icon: LayoutDashboard },
  { href: "/faktura", label: "Faktura", icon: FileText },
  { href: "/utgifter", label: "Utgifter", icon: ArrowDownCircle },
  { href: "/inntekter", label: "Inntekter", icon: ArrowUpCircle },
  { href: "/kunder", label: "Kunder", icon: Users },
  { href: "/bank-import", label: "Bank-import", icon: Building },
  { href: "/rapporter", label: "Rapporter", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users2 },
  { href: "/innstillinger", label: "Innstillinger", icon: Settings },
]

interface SidebarNavProps {
  teamName: string
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/")
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function SidebarNav({ teamName }: SidebarNavProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              B
            </div>
            <span className="font-semibold text-sidebar-foreground truncate">
              {teamName}
            </span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks />
        </div>
      </div>
    </aside>
  )
}

export function MobileNav({ teamName }: SidebarNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="lg:hidden" />}
      >
        <Menu className="size-5" />
        <span className="sr-only">Meny</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              B
            </div>
            <span className="truncate">{teamName}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="px-3 py-4">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
