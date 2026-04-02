"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createPayrollRun, deletePayrollRun } from "@/actions/payroll"
import { deleteEmployee } from "@/actions/employees"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import {
  Plus,
  Users,
  CalendarDays,
  Wallet,
  Trash2,
  Eye,
  Briefcase,
  UserMinus,
  Loader2,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PayrollRunRow = {
  id: string
  period: string
  status: "DRAFT" | "APPROVED" | "PAID"
  totalGross: number
  totalTax: number
  totalNet: number
  totalPension: number
  createdAt: string
}

type EmployeeRow = {
  id: string
  name: string
  email: string | null
  position: string | null
  department: string | null
  monthlySalary: number
  startDate: string
  isActive: boolean
}

type LonnTabsProps = {
  payrollRuns: PayrollRunRow[]
  employees: EmployeeRow[]
  paidThisYear: number
  activeCount: number
  currentPeriod: string
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

function PayrollStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT: {
      bg: "bg-slate-100",
      text: "text-slate-600",
      label: "Utkast",
    },
    APPROVED: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      label: "Godkjent",
    },
    PAID: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      label: "Betalt",
    },
  }

  const c = config[status] ?? config.DRAFT
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  New Payroll Dialog                                                  */
/* ------------------------------------------------------------------ */

function NewPayrollDialog({
  currentPeriod,
  onClose,
}: {
  currentPeriod: string
  onClose: () => void
}) {
  const [period, setPeriod] = useState(currentPeriod)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const result = await createPayrollRun(period)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          Ny lønnskjøring
        </h3>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="period"
              className="text-sm font-semibold text-slate-700"
            >
              Periode (YYYY-MM)
            </label>
            <input
              id="period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-primary focus:border-primary transition-all text-sm text-slate-900"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || !period}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Oppretter...
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Opprett lønnskjøring
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Tabbed Component                                              */
/* ------------------------------------------------------------------ */

export function LonnTabs({
  payrollRuns,
  employees,
  paidThisYear,
  activeCount,
  currentPeriod,
}: LonnTabsProps) {
  const [activeTab, setActiveTab] = useState<"payroll" | "employees">("payroll")
  const [showNewPayroll, setShowNewPayroll] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDeletePayroll(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deletePayrollRun(id)
      setDeletingId(null)
      router.refresh()
    })
  }

  function handleDeactivateEmployee(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deleteEmployee(id)
      setDeletingId(null)
      router.refresh()
    })
  }

  const tabs = [
    { key: "payroll" as const, label: "Lønnskjøringer" },
    { key: "employees" as const, label: "Ansatte" },
  ]

  return (
    <>
      {showNewPayroll && (
        <NewPayrollDialog
          currentPeriod={currentPeriod}
          onClose={() => setShowNewPayroll(false)}
        />
      )}

      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-white border border-slate-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={
                activeTab === tab.key
                  ? "px-5 py-2 text-sm font-semibold rounded-md bg-primary/10 text-primary transition-colors"
                  : "px-5 py-2 text-sm font-semibold rounded-md text-slate-500 hover:text-primary transition-colors"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "payroll" ? (
          <button
            onClick={() => setShowNewPayroll(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-sm shadow-primary/20"
          >
            <Plus className="size-4" />
            Ny lønnskjøring
          </button>
        ) : (
          <Link
            href="/lonn/ny-ansatt"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-sm shadow-primary/20"
          >
            <Plus className="size-4" />
            Ny ansatt
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      {activeTab === "payroll" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Utbetalt i år
              </p>
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Wallet className="size-4 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold">{formatCurrency(paidThisYear)}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Aktive ansatte
              </p>
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Users className="size-4 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold">{activeCount}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Neste lønnskjøring
              </p>
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <CalendarDays className="size-4 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold">{currentPeriod}</h3>
          </div>
        </div>
      )}

      {/* Payroll Runs Tab */}
      {activeTab === "payroll" && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          {payrollRuns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Periode
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Brutto
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Skatt
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Pensjon
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Netto
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Handlinger
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollRuns.map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/lonn/${run.id}`}
                          className="text-sm font-semibold text-slate-900 hover:text-primary transition-colors"
                        >
                          {run.period}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <PayrollStatusBadge status={run.status} />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {formatCurrency(run.totalGross)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatCurrency(run.totalTax)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatCurrency(run.totalPension)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {formatCurrency(run.totalNet)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/lonn/${run.id}`}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-primary transition-colors"
                          >
                            <Eye className="size-4" />
                          </Link>
                          {run.status === "DRAFT" && (
                            <button
                              onClick={() => handleDeletePayroll(run.id)}
                              disabled={isPending && deletingId === run.id}
                              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                            >
                              {isPending && deletingId === run.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CalendarDays className="size-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Ingen lønnskjøringer ennå
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Opprett din første lønnskjøring for å komme i gang med
                lønnsbehandling.
              </p>
              <button
                onClick={() => setShowNewPayroll(true)}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-sm shadow-primary/20"
              >
                <Plus className="size-4" />
                Ny lønnskjøring
              </button>
            </div>
          )}
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === "employees" && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          {employees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Ansatt
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Stilling
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Avdeling
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Månedslønn
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Startdato
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
                  {employees.map((emp) => {
                    const initials = emp.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {emp.name}
                              </div>
                              {emp.email && (
                                <div className="text-xs text-slate-400">
                                  {emp.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {emp.position || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {emp.department || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {formatCurrency(emp.monthlySalary)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatDate(emp.startDate)}
                        </td>
                        <td className="px-6 py-4">
                          {emp.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                              Aktiv
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
                              Inaktiv
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {emp.isActive && (
                              <button
                                onClick={() => handleDeactivateEmployee(emp.id)}
                                disabled={isPending && deletingId === emp.id}
                                title="Deaktiver ansatt"
                                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                              >
                                {isPending && deletingId === emp.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <UserMinus className="size-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Briefcase className="size-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Ingen ansatte ennå
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Legg til din første ansatt for å komme i gang med
                lønnsbehandling.
              </p>
              <Link
                href="/lonn/ny-ansatt"
                className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-sm shadow-primary/20"
              >
                <Plus className="size-4" />
                Ny ansatt
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  )
}
