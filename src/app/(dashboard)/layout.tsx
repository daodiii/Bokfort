import { getCurrentTeam } from "@/lib/auth-utils"
import { SidebarNav, MobileNav } from "@/components/sidebar-nav"
import { UserMenu } from "@/components/user-menu"
import { AiChatBubble } from "@/components/ai-chat-bubble"

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
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <MobileNav teamName={team.companyName || team.name} />
            <h1 className="text-sm font-medium text-muted-foreground lg:hidden">
              {team.companyName || team.name}
            </h1>
          </div>
          <UserMenu userName={user.name ?? ""} userEmail={user.email ?? ""} />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      <AiChatBubble />
    </div>
  )
}
