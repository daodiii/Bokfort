import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Plus,
  Repeat,
  Pause,
  CalendarClock,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { RecurringInvoiceActions } from "./recurring-invoice-actions"
import { GenerateNowButton } from "./generate-now-button"

export const metadata = {
  title: "Gjentakende fakturaer | Bokført",
}

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Ukentlig",
  BIWEEKLY: "Annenhver uke",
  MONTHLY: "Månedlig",
  QUARTERLY: "Kvartalsvis",
  YEARLY: "Årlig",
}

// Multiplier to normalize invoice amount to monthly value
const FREQUENCY_MONTHLY_MULTIPLIER: Record<string, number> = {
  WEEKLY: 52 / 12,
  BIWEEKLY: 26 / 12,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  YEARLY: 1 / 12,
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function calculateLineTotal(lines: { quantity: number; unitPrice: number; mvaRate: number }[]): number {
  return lines.reduce((sum, line) => {
    const lineTotal = line.quantity * line.unitPrice
    const mva = Math.round(lineTotal * line.mvaRate / 100)
    return sum + lineTotal + mva
  }, 0)
}

export default async function GjentakendeFakturaPage() {
  const { team } = await getCurrentTeam()

  const recurringInvoices = await db.recurringInvoice.findMany({
    where: { teamId: team.id },
    include: {
      customer: true,
      lines: true,
      _count: {
        select: { invoices: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const hasRecurring = recurringInvoices.length > 0

  // Compute stats
  const activeCount = recurringInvoices.filter((ri) => ri.isActive).length
  const pausedCount = recurringInvoices.filter((ri) => !ri.isActive).length

  // Estimated monthly value: sum of all active invoices normalized to monthly
  const monthlyValue = recurringInvoices
    .filter((ri) => ri.isActive)
    .reduce((sum, ri) => {
      const total = calculateLineTotal(ri.lines)
      const monthlyMultiplier = FREQUENCY_MONTHLY_MULTIPLIER[ri.frequency] ?? 1
      return sum + Math.round(total * monthlyMultiplier)
    }, 0)

  // Find the nearest next run date among active invoices
  const activeWithDates = recurringInvoices
    .filter((ri) => ri.isActive && ri.nextRunDate)
    .map((ri) => ri.nextRunDate)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  const nextRunDate = activeWithDates[0] ?? null

  return (
    <div className="space-y-6">
      {/* Title Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gjentakende fakturaer
          </h2>
          <p className="text-slate-500 text-sm">
            Automatiser fakturering med gjentakende maler
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GenerateNowButton />
          <Link
            href="/faktura"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-lg text-sm font-medium text-slate-600 hover:border-primary transition-colors"
          >
            Alle fakturaer
          </Link>
          <Link
            href="/faktura/gjentakende/ny"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-sm shadow-primary/20"
          >
            <Plus className="size-4" />
            <span>Ny gjentakende</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Aktive
          </p>
          <h3 className="text-xl font-bold mt-1">{activeCount}</h3>
          <div className="mt-2 flex items-center text-primary text-xs font-medium">
            <CheckCircle className="size-3.5" />
            <span className="ml-1">
              {activeCount === 1 ? "gjentakende faktura" : "gjentakende fakturaer"}
            </span>
          </div>
        </div>

        {/* Paused */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            På pause
          </p>
          <h3 className="text-xl font-bold mt-1">{pausedCount}</h3>
          <div className="mt-2 flex items-center text-amber-500 text-xs font-medium">
            <Pause className="size-3.5" />
            <span className="ml-1">
              {pausedCount === 1 ? "faktura satt på pause" : "fakturaer satt på pause"}
            </span>
          </div>
        </div>

        {/* Monthly Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Estimert månedlig
          </p>
          <h3 className="text-xl font-bold mt-1">
            {formatCurrency(monthlyValue)}
          </h3>
          <div className="mt-2 flex items-center text-primary text-xs font-medium">
            <TrendingUp className="size-3.5" />
            <span className="ml-1">fra aktive fakturaer</span>
          </div>
        </div>

        {/* Next Run */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Neste kjøring
          </p>
          <h3 className="text-xl font-bold mt-1">
            {nextRunDate ? formatDate(nextRunDate) : "Ingen planlagt"}
          </h3>
          <div className="mt-2 flex items-center text-slate-400 text-xs font-medium">
            <Clock className="size-3.5" />
            <span className="ml-1">neste automatiske faktura</span>
          </div>
        </div>
      </div>

      {/* Table */}
      {hasRecurring ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Frekvens
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Beløp
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Neste kjøring
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                    Handlinger
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recurringInvoices.map((ri) => {
                  const total = calculateLineTotal(ri.lines)
                  return (
                    <tr
                      key={ri.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {getInitials(ri.customer.name)}
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {ri.customer.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Repeat className="size-3.5 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {FREQUENCY_LABELS[ri.frequency] ?? ri.frequency}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(ri.nextRunDate)}
                      </td>
                      <td className="px-6 py-4">
                        {ri.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            På pause
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <RecurringInvoiceActions
                          id={ri.id}
                          isActive={ri.isActive}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500">
              Viser {recurringInvoices.length} av {recurringInvoices.length} gjentakende fakturaer
            </p>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CalendarClock className="size-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Ingen gjentakende fakturaer ennå
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Opprett en gjentakende faktura for å automatisere faktureringen din.
            </p>
            <Link
              href="/faktura/gjentakende/ny"
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-sm shadow-primary/20"
            >
              <Plus className="size-4" />
              <span>Ny gjentakende faktura</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
