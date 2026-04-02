"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Clock, Receipt, FileText } from "lucide-react"

type TimeEntryData = {
  id: string
  description: string | null
  date: Date
  hours: number
  billable: boolean
  hourlyRate: number | null
  user: { name: string }
}

type ExpenseData = {
  id: string
  description: string
  amount: number
  date: Date
  category: { name: string } | null
}

type InvoiceData = {
  id: string
  invoiceNumber: number
  total: number
  status: string
  issueDate: Date
  customer: { name: string }
}

type ProjectTabsProps = {
  timeEntries: TimeEntryData[]
  expenses: ExpenseData[]
  invoices: InvoiceData[]
}

const statusLabels: Record<string, { label: string; classes: string }> = {
  DRAFT: {
    label: "Utkast",
    classes: "bg-slate-100 text-slate-600",
  },
  SENT: {
    label: "Sendt",
    classes: "bg-blue-100 text-blue-700",
  },
  PAID: {
    label: "Betalt",
    classes: "bg-primary/10 text-primary",
  },
  OVERDUE: {
    label: "Forfalt",
    classes: "bg-red-100 text-red-700",
  },
}

export function ProjectTabs({
  timeEntries,
  expenses,
  invoices,
}: ProjectTabsProps) {
  return (
    <Tabs defaultValue="timer">
      <TabsList
        variant="line"
        className="border-b border-slate-100 w-full justify-start px-6 gap-0"
      >
        <TabsTrigger
          value="timer"
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium"
        >
          <Clock className="size-4" />
          Timer
          <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-slate-100 rounded-md">
            {timeEntries.length}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="utgifter"
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium"
        >
          <Receipt className="size-4" />
          Utgifter
          <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-slate-100 rounded-md">
            {expenses.length}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="fakturaer"
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium"
        >
          <FileText className="size-4" />
          Fakturaer
          <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-slate-100 rounded-md">
            {invoices.length}
          </span>
        </TabsTrigger>
      </TabsList>

      {/* Time Entries Tab */}
      <TabsContent value="timer">
        {timeEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Dato</th>
                  <th className="px-6 py-4">Beskrivelse</th>
                  <th className="px-6 py-4">Bruker</th>
                  <th className="px-6 py-4 text-right">Timer</th>
                  <th className="px-6 py-4 text-center">Fakturerbar</th>
                  <th className="px-6 py-4 text-right">Sats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timeEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {entry.description || "–"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {entry.user.name}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right">
                      {entry.hours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {entry.billable ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          Ja
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          Nei
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-500">
                      {entry.hourlyRate
                        ? formatCurrency(entry.hourlyRate) + "/t"
                        : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="size-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              Ingen timer registrert ennå.
            </p>
          </div>
        )}
      </TabsContent>

      {/* Expenses Tab */}
      <TabsContent value="utgifter">
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Dato</th>
                  <th className="px-6 py-4">Beskrivelse</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4 text-right">Beløp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600">
                        {expense.category?.name ?? "Ukategorisert"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="size-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              Ingen utgifter knyttet til prosjektet.
            </p>
          </div>
        )}
      </TabsContent>

      {/* Invoices Tab */}
      <TabsContent value="fakturaer">
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Fakturanr.</th>
                  <th className="px-6 py-4">Dato</th>
                  <th className="px-6 py-4">Kunde</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Beløp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => {
                  const status = statusLabels[invoice.status] ?? {
                    label: invoice.status,
                    classes: "bg-slate-100 text-slate-600",
                  }
                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-bold">
                        #{invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {invoice.customer.name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.classes}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-right">
                        {formatCurrency(invoice.total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="size-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              Ingen fakturaer knyttet til prosjektet.
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
