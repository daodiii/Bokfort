import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Plane,
  MapPin,
  Calendar,
  User,
  Receipt,
} from "lucide-react"
import type { TravelExpenseStatus } from "@/generated/prisma/client"
import { TravelExpenseActions } from "./travel-expense-actions"

export const metadata = {
  title: "Reiseregning | Bokfort",
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

const categoryLabels: Record<string, string> = {
  Transport: "Transport",
  Overnatting: "Overnatting",
  Diett: "Diett",
  Annet: "Annet",
}

export default async function ReiseregningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { team } = await getCurrentTeam()

  const expense = await db.travelExpense.findFirst({
    where: { id, teamId: team.id },
    include: {
      items: { orderBy: { date: "asc" } },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  })

  if (!expense) {
    notFound()
  }

  const config = statusConfig[expense.status]

  // Group items by category for the summary
  const categoryTotals = new Map<string, number>()
  for (const item of expense.items) {
    const prev = categoryTotals.get(item.category) ?? 0
    categoryTotals.set(item.category, prev + item.amount)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/reiseregning"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
      >
        <ArrowLeft className="size-4" />
        Tilbake til reiseregninger
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Plane className="size-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {expense.description}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
              >
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <User className="size-3.5" />
                {expense.createdBy.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                Opprettet {formatDate(expense.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <TravelExpenseActions id={expense.id} status={expense.status} />
      </div>

      {/* Trip Info Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          Reiseinformasjon
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Destination */}
          <div>
            <p className="text-xs text-slate-400 mb-1">Destinasjon</p>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
              <MapPin className="size-4 text-slate-400" />
              {expense.destination || "Ikke oppgitt"}
            </div>
          </div>

          {/* Depart Date */}
          <div>
            <p className="text-xs text-slate-400 mb-1">Avreisedato</p>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
              <Calendar className="size-4 text-slate-400" />
              {formatDate(expense.departDate)}
            </div>
          </div>

          {/* Return Date */}
          <div>
            <p className="text-xs text-slate-400 mb-1">Returdato</p>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
              <Calendar className="size-4 text-slate-400" />
              {expense.returnDate
                ? formatDate(expense.returnDate)
                : "Ikke oppgitt"}
            </div>
          </div>

          {/* Approved By */}
          {expense.approvedBy && (
            <div>
              <p className="text-xs text-slate-400 mb-1">
                {expense.status === "REJECTED"
                  ? "Avvist av"
                  : "Godkjent av"}
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                <User className="size-4 text-slate-400" />
                {expense.approvedBy.name}
                {expense.approvedAt && (
                  <span className="text-slate-400 text-xs">
                    ({formatDate(expense.approvedAt)})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Receipt className="size-5 text-slate-400" />
            Utgiftsposter
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Beskrivelse
                </th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dato
                </th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Belop
                </th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  MVA
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expense.items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {item.description}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-100 text-slate-600">
                      {categoryLabels[item.category] ?? item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-right">
                    {item.mvaAmount > 0
                      ? formatCurrency(item.mvaAmount)
                      : "-"}
                    {item.mvaRate > 0 && (
                      <span className="text-slate-400 ml-1">
                        ({item.mvaRate}%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total Summary Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          Oppsummering
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category breakdown */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Per kategori
            </p>
            {Array.from(categoryTotals.entries()).map(([cat, total]) => (
              <div key={cat} className="flex justify-between items-center">
                <span className="text-sm text-slate-600">
                  {categoryLabels[cat] ?? cat}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(total)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end justify-end">
            <div className="w-full md:w-72 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">
                  Antall poster
                </span>
                <span className="text-slate-900 font-medium">
                  {expense.items.length}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">MVA totalt</span>
                <span className="text-slate-900 font-medium">
                  {formatCurrency(expense.mvaAmount)}
                </span>
              </div>
              <div className="h-px bg-slate-200 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-slate-900">
                  Totalbelop
                </span>
                <span className="text-xl font-black text-primary">
                  {formatCurrency(expense.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
