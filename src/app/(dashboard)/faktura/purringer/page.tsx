import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Bell,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle,
  BanknoteIcon,
  Eye,
} from "lucide-react"
import Link from "next/link"
import { SendReminderButton, AutoCreateRemindersButton } from "./purring-actions"
import type { ReminderStatus } from "@/generated/prisma/client"

export const metadata = {
  title: "Purringer | Bokført",
}

const statusConfig: Record<
  ReminderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Venter",
    className: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  SENT: {
    label: "Sendt",
    className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  FAILED: {
    label: "Feilet",
    className: "bg-rose-100 text-rose-700 border border-rose-200",
  },
}

function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function getDaysOverdue(dueDate: Date): number {
  const now = new Date()
  const due = new Date(dueDate)
  const diffTime = now.getTime() - due.getTime()
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
}

export default async function PurringerPage() {
  const { team } = await getCurrentTeam()

  // Get all reminders with invoice+customer info
  const reminders = await db.paymentReminder.findMany({
    where: { teamId: team.id },
    include: {
      invoice: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get overdue invoices without any reminders
  const overdueWithoutReminders = await db.invoice.findMany({
    where: {
      teamId: team.id,
      status: "OVERDUE",
      reminders: {
        none: {},
      },
    },
    include: { customer: true },
    orderBy: { dueDate: "asc" },
  })

  // Stats
  const pendingReminders = reminders.filter((r) => r.status === "PENDING")
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const sentThisMonth = reminders.filter(
    (r) => r.status === "SENT" && r.sentAt && new Date(r.sentAt) >= startOfMonth
  )
  const totalOutstanding = reminders
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + r.invoice.total, 0)

  const hasReminders = reminders.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purringer</h2>
          <p className="text-slate-500 text-sm">
            Følg opp ubetalte fakturaer med betalingspåminnelser
          </p>
        </div>
        <AutoCreateRemindersButton
          overdueWithoutReminderCount={overdueWithoutReminders.length}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending reminders */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Ventende purringer
          </p>
          <h3 className="text-xl font-bold mt-1">{pendingReminders.length}</h3>
          <div className="mt-2 flex items-center text-amber-500 text-xs font-medium">
            <Clock className="size-3.5" />
            <span className="ml-1">Venter på å bli sendt</span>
          </div>
        </div>

        {/* Sent this month */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Sendt denne måneden
          </p>
          <h3 className="text-xl font-bold mt-1">{sentThisMonth.length}</h3>
          <div className="mt-2 flex items-center text-emerald-500 text-xs font-medium">
            <CheckCircle className="size-3.5" />
            <span className="ml-1">Purringer sendt</span>
          </div>
        </div>

        {/* Overdue without reminder */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Uten purring
          </p>
          <h3 className="text-xl font-bold mt-1">
            {overdueWithoutReminders.length}
          </h3>
          <div className="mt-2 flex items-center text-rose-500 text-xs font-medium">
            <AlertTriangle className="size-3.5" />
            <span className="ml-1">Forfalte fakturaer uten purring</span>
          </div>
        </div>

        {/* Total outstanding */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Utestående beløp
          </p>
          <h3 className="text-xl font-bold mt-1">
            {formatCurrency(totalOutstanding)}
          </h3>
          <div className="mt-2 flex items-center text-primary text-xs font-medium">
            <BanknoteIcon className="size-3.5" />
            <span className="ml-1">I ventende purringer</span>
          </div>
        </div>
      </div>

      {/* Reminders Table */}
      {hasReminders ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Faktura
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Forfallsdato
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Dager forfalt
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
                {reminders.map((reminder) => {
                  const daysOverdue = getDaysOverdue(reminder.invoice.dueDate)
                  const initials = reminder.invoice.customer.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <tr
                      key={reminder.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/faktura/${reminder.invoice.id}`}
                          className="text-sm font-semibold text-slate-900 hover:text-primary transition-colors"
                        >
                          #INV-
                          {String(reminder.invoice.invoiceNumber).padStart(
                            3,
                            "0"
                          )}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {reminder.invoice.customer.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(reminder.invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-bold ${
                            daysOverdue > 30
                              ? "text-rose-600"
                              : daysOverdue > 14
                                ? "text-amber-600"
                                : "text-slate-700"
                          }`}
                        >
                          {daysOverdue} dager
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {formatCurrency(reminder.invoice.total)}
                      </td>
                      <td className="px-6 py-4">
                        <ReminderStatusBadge status={reminder.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {reminder.status === "PENDING" ? (
                            <SendReminderButton
                              reminderId={reminder.id}
                              customerName={
                                reminder.invoice.customer.name
                              }
                              invoiceNumber={
                                reminder.invoice.invoiceNumber
                              }
                            />
                          ) : (
                            <Link
                              href={`/faktura/${reminder.invoice.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-800 transition-colors"
                            >
                              <Eye className="size-3.5" />
                              Vis
                            </Link>
                          )}
                        </div>
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
              Viser {reminders.length}{" "}
              {reminders.length === 1 ? "purring" : "purringer"}
            </p>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bell className="size-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Ingen purringer ennå
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Når du har forfalte fakturaer kan du opprette betalingspåminnelser
              herfra. Purringer hjelper deg å følge opp ubetalte fakturaer
              effektivt.
            </p>
            {overdueWithoutReminders.length > 0 && (
              <div className="mt-6">
                <AutoCreateRemindersButton
                  overdueWithoutReminderCount={overdueWithoutReminders.length}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overdue invoices without reminders section */}
      {overdueWithoutReminders.length > 0 && hasReminders && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Forfalte fakturaer uten purring
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Disse fakturaene har passert forfallsdatoen og har ingen
              betalingspåminnelse ennå
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Faktura
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Forfallsdato
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Dager forfalt
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Beløp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueWithoutReminders.map((invoice) => {
                  const daysOverdue = getDaysOverdue(invoice.dueDate)
                  const initials = invoice.customer.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/faktura/${invoice.id}`}
                          className="text-sm font-semibold text-slate-900 hover:text-primary transition-colors"
                        >
                          #INV-
                          {String(invoice.invoiceNumber).padStart(3, "0")}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-[10px] shrink-0">
                            {initials}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {invoice.customer.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm font-bold text-rose-600">
                          {daysOverdue} dager
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm font-bold text-slate-900">
                        {formatCurrency(invoice.total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
