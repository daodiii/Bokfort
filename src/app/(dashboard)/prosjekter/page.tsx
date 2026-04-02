import { getCurrentTeam } from "@/lib/auth-utils"
import { getProjects } from "@/actions/projects"
import { formatCurrency } from "@/lib/utils"
import {
  FolderKanban,
  Plus,
  Clock,
  Wallet,
  Target,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Prosjekter | Bokført",
}

export default async function ProsjekterPage() {
  const { team } = await getCurrentTeam()
  const projects = await getProjects()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const activeCount = projects.filter((p) => p.isActive).length
  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0)

  // For hours this month, we need fresh data
  const allHours = projects.reduce((s, p) => s + p.totalHours, 0)
  const allBillable = projects.reduce((s, p) => s + p.billableHours, 0)
  const billablePct = allHours > 0 ? Math.round((allBillable / allHours) * 100) : 0

  const hasProjects = projects.length > 0

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Prosjekter</h2>
          <p className="text-slate-500 text-sm">
            Følg opp prosjekter, timer og lønnsomhet
          </p>
        </div>
        <Link
          href="/prosjekter/nytt"
          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-all shadow-sm"
        >
          <Plus className="size-5" />
          <span>Nytt prosjekt</span>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">
              Aktive prosjekter
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <FolderKanban className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{activeCount}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">
              Totalt timer
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{allHours.toFixed(1)}</span>
            <span className="text-sm text-slate-400">timer</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">
              Totalt budsjett
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {totalBudget > 0 ? formatCurrency(totalBudget) : "–"}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">
              Fakturerbar %
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{billablePct}%</span>
          </div>
        </div>
      </div>

      {/* Project Cards Grid */}
      {hasProjects ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const budgetUsedPct =
              project.budget && project.budget > 0
                ? Math.min(
                    100,
                    Math.round((project.totalExpenses / project.budget) * 100)
                  )
                : null

            return (
              <Link
                key={project.id}
                href={`/prosjekter/${project.id}`}
                className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all p-6 flex flex-col gap-4"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="size-3 rounded-full shrink-0 mt-1.5"
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                        {project.name}
                      </h3>
                      {project.customerName && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {project.customerName}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {project.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>

                {/* Budget Progress Bar */}
                {budgetUsedPct !== null && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500">Budsjettbruk</span>
                      <span className="font-bold text-slate-700">
                        {budgetUsedPct}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${budgetUsedPct}%`,
                          backgroundColor:
                            budgetUsedPct > 90
                              ? "#ef4444"
                              : budgetUsedPct > 70
                                ? "#f59e0b"
                                : project.color,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-50">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Timer</p>
                    <p className="text-sm font-bold text-slate-700">
                      {project.totalHours.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Utgifter</p>
                    <p className="text-sm font-bold text-slate-700">
                      {formatCurrency(project.totalExpenses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Fakturert</p>
                    <p className="text-sm font-bold text-slate-700">
                      {formatCurrency(project.totalInvoiced)}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <FolderKanban className="size-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Ingen prosjekter ennå</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Opprett ditt første prosjekt for å begynne å spore timer,
              utgifter og lønnsomhet.
            </p>
            <Link
              href="/prosjekter/nytt"
              className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-all shadow-sm"
            >
              <Plus className="size-4" />
              Nytt prosjekt
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
