import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Users, Download } from "lucide-react"
import { PayrollActionButtons } from "./payroll-detail-client"

export const metadata = {
  title: "Lønnskjøring | Bokført",
}

const statusConfig: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  DRAFT: { bg: "bg-slate-100", text: "text-slate-600", label: "Utkast" },
  APPROVED: { bg: "bg-amber-100", text: "text-amber-700", label: "Godkjent" },
  PAID: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Betalt" },
}

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { team } = await getCurrentTeam()

  const payrollRun = await db.payrollRun.findFirst({
    where: { id, teamId: team.id },
    include: {
      entries: {
        include: { employee: true },
        orderBy: { employee: { name: "asc" } },
      },
      approvedBy: true,
    },
  })

  if (!payrollRun) {
    notFound()
  }

  const sc = statusConfig[payrollRun.status] ?? statusConfig.DRAFT

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/lonn"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">
                Lønnskjøring {payrollRun.period}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${sc.bg} ${sc.text}`}
              >
                {sc.label}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              Opprettet {formatDate(payrollRun.createdAt)}
              {payrollRun.approvedBy &&
                ` | Godkjent av ${payrollRun.approvedBy.name}`}
              {payrollRun.paidAt &&
                ` | Betalt ${formatDate(payrollRun.paidAt)}`}
            </p>
          </div>
        </div>

        <PayrollActionButtons id={payrollRun.id} status={payrollRun.status} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            Brutto
          </p>
          <h3 className="text-lg font-bold text-slate-900">
            {formatCurrency(payrollRun.totalGross)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            Skatt
          </p>
          <h3 className="text-lg font-bold text-rose-600">
            -{formatCurrency(payrollRun.totalTax)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            Pensjon
          </p>
          <h3 className="text-lg font-bold text-amber-600">
            {formatCurrency(payrollRun.totalPension)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            Netto utbetaling
          </p>
          <h3 className="text-lg font-bold text-primary">
            {formatCurrency(payrollRun.totalNet)}
          </h3>
        </div>
      </div>

      {/* Info strip */}
      <div className="flex items-center gap-6 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CalendarDays className="size-4 text-slate-400" />
          <span className="font-medium">Periode:</span> {payrollRun.period}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users className="size-4 text-slate-400" />
          <span className="font-medium">Ansatte:</span>{" "}
          {payrollRun.entries.length}
        </div>
      </div>

      {/* Entry Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="font-bold text-lg">Lønnsdetaljer per ansatt</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ansatt
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Brutto
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Skatt
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Pensjon
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Netto
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Lønnsslipp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollRun.entries.map((entry) => {
                const initials = entry.employee.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)

                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {entry.employee.name}
                          </div>
                          {entry.employee.position && (
                            <div className="text-xs text-slate-400">
                              {entry.employee.position}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700 text-right">
                      {formatCurrency(entry.grossAmount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-rose-600 text-right">
                      -{formatCurrency(entry.taxAmount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-amber-600 text-right">
                      {formatCurrency(entry.pensionAmount)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                      {formatCurrency(entry.netAmount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/api/lonn/${payrollRun.id}/${entry.id}/payslip`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-primary border border-slate-200 hover:border-primary/30 rounded-lg transition-colors"
                      >
                        <Download className="size-3.5" />
                        PDF
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Totals Footer */}
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                  Totalt ({payrollRun.entries.length} ansatte)
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                  {formatCurrency(payrollRun.totalGross)}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-rose-600 text-right">
                  -{formatCurrency(payrollRun.totalTax)}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-amber-600 text-right">
                  {formatCurrency(payrollRun.totalPension)}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-primary text-right">
                  {formatCurrency(payrollRun.totalNet)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
