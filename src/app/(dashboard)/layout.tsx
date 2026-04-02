import { getCurrentTeam } from "@/lib/auth-utils"
import { SidebarNav, MobileNav } from "@/components/sidebar-nav"
import { UserMenu } from "@/components/user-menu"
import { AiChatBubble } from "@/components/ai-chat-bubble"
import { Search, Bell, Settings } from "lucide-react"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, team } = await getCurrentTeam()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <SidebarNav teamName={team.companyName || team.name} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="h-[3.75rem] bg-white border-b border-slate-100 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-lg">
            <MobileNav teamName={team.companyName || team.name} />
            <div className="relative w-full hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Søk transaksjoner, rapporter..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 text-sm placeholder:text-slate-400 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
              <Bell className="size-5" />
            </button>
            <Link
              href="/innstillinger"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <Settings className="size-5" />
            </Link>
            <UserMenu userName={user.name ?? ""} userEmail={user.email ?? ""} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#F4F6F5]">
          <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      <AiChatBubble />
    </div>
  )
}
