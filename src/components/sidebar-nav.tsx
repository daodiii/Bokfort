"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  ArrowDownCircle,
  Users,
  Building,
  BarChart3,
  Settings,
  Menu,
  FolderKanban,
  Clock,
  Wallet,
  Plane,
  BookOpen,
  Send,
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

type NavSection = {
  title?: string
  items: { href: string; label: string; icon: typeof LayoutDashboard }[]
}

const navSections: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Oversikt", icon: LayoutDashboard },
      { href: "/faktura", label: "Faktura", icon: FileText },
      { href: "/utgifter", label: "Utgifter", icon: ArrowDownCircle },
      { href: "/kunder", label: "Kunder", icon: Users },
      { href: "/bank-import", label: "Avstemming", icon: Building },
    ],
  },
  {
    title: "Prosjekt & tid",
    items: [
      { href: "/prosjekter", label: "Prosjekter", icon: FolderKanban },
      { href: "/timer", label: "Timeføring", icon: Clock },
    ],
  },
  {
    title: "Personal",
    items: [
      { href: "/lonn", label: "Lønn", icon: Wallet },
      { href: "/reiseregning", label: "Reiseregning", icon: Plane },
    ],
  },
  {
    title: "Regnskap",
    items: [
      { href: "/regnskap", label: "Hovedbok", icon: BookOpen },
      { href: "/rapporter", label: "Rapporter", icon: BarChart3 },
      { href: "/rapporter/altinn", label: "Altinn", icon: Send },
    ],
  },
]

interface SidebarNavProps {
  teamName: string
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const isSettingsActive =
    pathname === "/innstillinger" || pathname.startsWith("/innstillinger/")

  return (
    <>
      <nav className="flex flex-col gap-0.5">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className={section.title ? "mt-4 first:mt-0" : ""}>
            {section.title && (
              <p className="px-3 mb-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/")
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  )}
                >
                  <Icon className="size-[17px] shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      {/* Settings link at bottom of nav in mobile */}
      <div className="mt-auto pt-4 border-t border-slate-100 lg:hidden">
        <Link
          href="/innstillinger"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            isSettingsActive
              ? "bg-primary/10 text-primary font-semibold"
              : "text-slate-600 hover:bg-slate-50 transition-colors"
          )}
        >
          <Settings className="size-[18px] shrink-0" />
          Innstillinger
        </Link>
      </div>
    </>
  )
}

export function SidebarNav({ teamName }: SidebarNavProps) {
  const pathname = usePathname()
  const isSettingsActive =
    pathname === "/innstillinger" || pathname.startsWith("/innstillinger/")

  return (
    <aside className="hidden w-[15rem] shrink-0 border-r border-slate-100 bg-white lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-white font-bold text-sm shrink-0"
              style={{ fontFamily: "var(--font-fraunces)" }}>
              B
            </div>
            <div className="flex flex-col">
              <span
                className="text-slate-900 leading-none"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  fontSize: "1.125rem",
                  fontWeight: 700,
                }}
              >
                Bokført
              </span>
              <span className="text-xs text-primary font-medium mt-0.5 truncate max-w-[120px]">
                {teamName}
              </span>
            </div>
          </Link>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          <NavLinks />
        </nav>

        {/* Settings at bottom */}
        <div className="p-3 border-t border-slate-50">
          <Link
            href="/innstillinger"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isSettingsActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            )}
          >
            <Settings className="size-[17px] shrink-0" />
            Innstillinger
          </Link>
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
        <SheetHeader className="border-b border-slate-100 px-4">
          <SheetTitle className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
              B
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">Bokført</span>
              <span className="text-xs text-primary font-medium">{teamName}</span>
            </div>
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 py-4 flex flex-col h-[calc(100%-4rem)]">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
