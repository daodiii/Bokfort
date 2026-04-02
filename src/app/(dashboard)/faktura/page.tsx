import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import { InvoiceStatusBadge } from "@/components/invoice-status-badge"
import {
  Plus,
  FileText,
  Pencil,
  Download,
  Trash2,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Repeat,
  Bell,
} from "lucide-react"
import Link from "next/link"
import type { InvoiceStatus } from "@/generated/prisma/client"

export const metadata = {
  title: "Fakturaer | Bokført",
}

const STATUS_TABS: {
  value: string
  label: string
  statuses: InvoiceStatus[] | null
}[] = [
  { value: "alle", label: "Alle", statuses: null },
  { value: "betalt", label: "Betalt", statuses: ["PAID"] },
  { value: "ventende", label: "Ventende", statuses: ["DRAFT", "SENT"] },
  { value: "forfalt", label: "Forfalt", statuses: ["OVERDUE"] },
]

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default async function FakturaPage() {
  const { team } = await getCurrentTeam()

  const invoices = await db.invoice.findMany({
    where: { teamId: team.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  })

  const hasInvoices = invoices.length > 0

  // Compute stats from real data
  const totalVolume = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const paidInvoices = invoices.filter((inv) => inv.status === "PAID")
  const paidTotal = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const pendingInvoices = invoices.filter(
    (inv) => inv.status === "DRAFT" || inv.status === "SENT"
  )
  const pendingTotal = pendingInvoices.reduce(
    (sum, inv) => sum + inv.total,
    0
  )
  const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE")
  const overdueTotal = overdueInvoices.reduce(
    (sum, inv) => sum + inv.total,
    0
  )

  return (
    <div className="space-y-6">
      {/* Title and Filter Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Fakturaer
          </h2>
          <p className="text-slate-500 text-sm">
            Administrer og spor alle dine utgående fakturaer
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center bg-white border border-slate-100 rounded-lg p-1">
            {STATUS_TABS.map((tab, idx) => (
              <span
                key={tab.value}
                className={
                  idx === 0
                    ? "px-4 py-1.5 text-xs font-semibold rounded-md bg-primary/10 text-primary cursor-default"
                    : "px-4 py-1.5 text-xs font-semibold rounded-md text-slate-500 hover:text-primary transition-colors cursor-pointer"
                }
              >
                {tab.label}
              </span>
            ))}
          </div>

          {/* Date Range Picker */}
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-primary transition-colors">
            <Calendar className="size-4" />
            <span>Velg datoperiode</span>
            <ChevronDown className="size-4" />
          </button>

          {/* Filter Button */}
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-lg text-slate-600 dark:text-slate-300 hover:border-primary transition-colors">
            <SlidersHorizontal className="size-4" />
          </button>

          {/* Recurring Invoices */}
          <Link
            href="/faktura/gjentakende"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-lg text-sm font-medium text-slate-600 hover:border-primary transition-colors"
          >
            <Repeat className="size-4" />
            <span>Gjentakende</span>
          </Link>

          {/* Payment Reminders */}
          <Link
            href="/faktura/purringer"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-lg text-sm font-medium text-slate-600 hover:border-primary transition-colors"
          >
            <Bell className="size-4" />
            <span>Purringer</span>
          </Link>

          {/* Create New Invoice */}
          <Link
            href="/faktura/ny"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-sm shadow-primary/20"
          >
            <Plus className="size-4" />
            <span>Ny faktura</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Totalt volum
          </p>
          <h3 className="text-xl font-bold mt-1">
            {formatCurrency(totalVolume)}
          </h3>
          <div className="mt-2 flex items-center text-primary text-xs font-medium">
            <TrendingUp className="size-3.5" />
            <span className="ml-1">
              {invoices.length}{" "}
              {invoices.length === 1 ? "faktura" : "fakturaer"} totalt
            </span>
          </div>
        </div>

        {/* Paid Invoices */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Betalte fakturaer
          </p>
          <h3 className="text-xl font-bold mt-1">
            {formatCurrency(paidTotal)}
          </h3>
          <div className="mt-2 flex items-center text-primary text-xs font-medium">
            <CheckCircle className="size-3.5" />
            <span className="ml-1">
              {paidInvoices.length} fakturaer betalt
            </span>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Ventende
          </p>
          <h3 className="text-xl font-bold mt-1">
            {formatCurrency(pendingTotal)}
          </h3>
          <div className="mt-2 flex items-center text-amber-500 text-xs font-medium">
            <Clock className="size-3.5" />
            <span className="ml-1">
              {pendingInvoices.length} venter på betaling
            </span>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Forfalt
          </p>
          <h3 className="text-xl font-bold mt-1">
            {formatCurrency(overdueTotal)}
          </h3>
          <div className="mt-2 flex items-center text-rose-500 text-xs font-medium">
            <AlertTriangle className="size-3.5" />
            <span className="ml-1">
              {overdueInvoices.length} fakturaer forfalt
            </span>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      {hasInvoices ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Faktura-ID
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Dato
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Beløp
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
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/faktura/${invoice.id}`}
                        className="text-sm font-semibold text-slate-900 dark:text-white hover:text-primary transition-colors"
                      >
                        #INV-{String(invoice.invoiceNumber).padStart(3, "0")}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {getInitials(invoice.customer.name)}
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {invoice.customer.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-6 py-4">
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/faktura/${invoice.id}`}
                          className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-primary transition-colors"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <button className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-primary transition-colors">
                          <Download className="size-4" />
                        </button>
                        <button className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500">
              Viser {invoices.length} av {invoices.length} fakturaer
            </p>
            <div className="flex items-center gap-2">
              <button
                className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors disabled:opacity-50"
                disabled
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="size-8 flex items-center justify-center bg-primary text-white rounded-lg text-xs font-bold">
                1
              </span>
              <button
                className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors disabled:opacity-50"
                disabled
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="size-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Ingen fakturaer ennå
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Opprett din første faktura for å komme i gang med faktureringen.
            </p>
            <Link
              href="/faktura/ny"
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-sm shadow-primary/20"
            >
              <Plus className="size-4" />
              <span>Ny faktura</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
