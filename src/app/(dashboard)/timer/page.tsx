import { getCurrentTeam } from "@/lib/auth-utils"
import {
  getProjects,
  getTimeEntries,
  getWeeklySummary,
  getTimeStats,
} from "@/actions/time-entries"
import { formatCurrency } from "@/lib/utils"
import {
  Clock,
  CalendarDays,
  TrendingUp,
  DollarSign,
  Timer,
} from "lucide-react"
import { QuickAddForm, WeeklyView, TimeEntriesTable } from "./timer-components"

export const metadata = {
  title: "Timeføring | Bokført",
}

export default async function TimerPage() {
  const { team } = await getCurrentTeam()

  const [projects, entries, summary, stats] = await Promise.all([
    getProjects(),
    getTimeEntries(),
    getWeeklySummary(0),
    getTimeStats(),
  ])

  const hasEntries = entries.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Timeføring</h2>
        <p className="text-slate-500 text-sm mt-1">
          Registrer og følg opp timer på prosjekter
        </p>
      </div>

      {/* Quick Add */}
      <QuickAddForm projects={projects} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Week Hours */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              Denne uken
            </p>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="size-4 text-primary" />
            </div>
          </div>
          <h3 className="text-2xl font-bold">
            {stats.weekHours}
            <span className="text-base font-medium text-slate-400 ml-1">timer</span>
          </h3>
          <div className="mt-2 flex items-center text-slate-400 text-xs">
            <CalendarDays className="size-3.5 mr-1" />
            <span>Siste 7 dager</span>
          </div>
        </div>

        {/* Month Hours */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              Denne måneden
            </p>
            <div className="p-2 bg-slate-100 rounded-lg">
              <Timer className="size-4 text-slate-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold">
            {stats.monthHours}
            <span className="text-base font-medium text-slate-400 ml-1">timer</span>
          </h3>
          <div className="mt-2 flex items-center text-slate-400 text-xs">
            <CalendarDays className="size-3.5 mr-1" />
            <span>Inneværende måned</span>
          </div>
        </div>

        {/* Billable % */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              Fakturerbar andel
            </p>
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="size-4 text-primary" />
            </div>
          </div>
          <h3 className="text-2xl font-bold">
            {stats.billablePct}
            <span className="text-base font-medium text-slate-400 ml-1">%</span>
          </h3>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(stats.billablePct, 100)}%` }}
            />
          </div>
        </div>

        {/* Estimated Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              Estimert verdi
            </p>
            <div className="p-2 bg-slate-100 rounded-lg">
              <DollarSign className="size-4 text-slate-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold">
            {stats.estimatedValueOre > 0
              ? formatCurrency(stats.estimatedValueOre)
              : "0 kr"}
          </h3>
          <div className="mt-2 flex items-center text-slate-400 text-xs">
            <span>Fakturerbare timer denne mnd</span>
          </div>
        </div>
      </div>

      {/* Weekly View */}
      <WeeklyView summary={summary} />

      {/* Entries Table */}
      {hasEntries ? (
        <TimeEntriesTable entries={entries} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="size-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Ingen tidsregistreringer ennå
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Bruk skjemaet over for å registrere din første time.
              {projects.length === 0 &&
                " Du må først opprette et prosjekt."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
