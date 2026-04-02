import { getTravelExpenses } from "@/actions/travel-expenses"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Plus,
  Plane,
  Wallet,
  Clock,
  CheckCircle,
  TrendingUp,
  MapPin,
  Eye,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import type { TravelExpenseStatus } from "@/generated/prisma/client"

export const metadata = {
  title: "Reiseregninger | Bokfort",
}

const statusConfig: Record<
  TravelExpenseStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Utkast",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  },
  SUBMITTED: {
    label: "Innsendt",
    className: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  APPROVED: {
    label: "Godkjent",
    className: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  REJECTED: {
    label: "Avvist",
    className: "bg-rose-100 text-rose-700 border border-rose-200",
  },
  REIMBURSED: {
    label: "Utbetalt",
    className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
}

function StatusBadge({ status }: { status: TravelExpenseStatus }) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

export default async function ReiseregningPage() {
  const { expenses, stats } = await getTravelExpenses()
  const hasExpenses = expenses.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reiseregninger</h2>
          <p className="text-slate-500 text-sm">
            Registrer og folg opp reiseutgifter og diett
          </p>
        </div>
        <Link
          href="/reiseregning/ny"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-sm shadow-primary/20"
        >
          <Plus className="size-4" />
          <span>Ny reiseregning</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total this year */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Totalt i ar
          </p>
          <h3 className="text-xl font-bold mt-1">
            {formatCurrency(stats.totalThisYear)}
          </h3>
          <div className="mt-2 flex items-center text-primary text-xs font-medium">
            <TrendingUp className="size-3.5" />
            <span className="ml-1">
              {expenses.length}{" "}
              {expenses.length === 1 ? "reiseregning" : "reiseregninger"} totalt
            </span>
          </div>
        </div>

        {/* Pending approval */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Venter pa godkjenning
          </p>
          <h3 className="text-xl font-bold mt-1">{stats.pendingApproval}</h3>
          <div className="mt-2 flex items-center text-amber-500 text-xs font-medium">
            <Clock className="size-3.5" />
            <span className="ml-1">innsendte reiseregninger</span>
          </div>
        </div>

        {/* Reimbursed */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Utbetalt
          </p>
          <h3 className="text-xl font-bold mt-1">
            {formatCurrency(stats.reimbursedTotal)}
          </h3>
          <div className="mt-2 flex items-center text-emerald-500 text-xs font-medium">
            <CheckCircle className="size-3.5" />
            <span className="ml-1">refundert totalt</span>
          </div>
        </div>

        {/* Average per trip */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Gjennomsnitt per reise
          </p>
          <h3 className="text-xl font-bold mt-1">
            {formatCurrency(stats.avgPerTrip)}
          </h3>
          <div className="mt-2 flex items-center text-slate-500 text-xs font-medium">
            <Wallet className="size-3.5" />
            <span className="ml-1">basert pa i ar</span>
          </div>
        </div>
      </div>

      {/* Travel Expenses Table */}
      {hasExpenses ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Beskrivelse
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Destinasjon
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Datoer
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Totalbelop
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
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/reiseregning/${expense.id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Plane className="size-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {expense.description}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {expense.destination ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="size-3.5 text-slate-400" />
                          {expense.destination}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(expense.departDate)}
                      {expense.returnDate && (
                        <> &ndash; {formatDate(expense.returnDate)}</>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      {formatCurrency(expense.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={expense.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/reiseregning/${expense.id}`}
                          className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-primary transition-colors"
                        >
                          <Eye className="size-4" />
                        </Link>
                        {expense.status === "DRAFT" && (
                          <button className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-rose-500 transition-colors">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500">
              Viser {expenses.length}{" "}
              {expenses.length === 1 ? "reiseregning" : "reiseregninger"}
            </p>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plane className="size-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Ingen reiseregninger enna
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Opprett din forste reiseregning for a registrere reiseutgifter og
              diett.
            </p>
            <Link
              href="/reiseregning/ny"
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-sm shadow-primary/20"
            >
              <Plus className="size-4" />
              <span>Ny reiseregning</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
