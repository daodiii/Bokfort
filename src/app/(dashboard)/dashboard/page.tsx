import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  TrendingUp,
  FileText,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react"
import { AnomalyAlerts } from "@/components/anomaly-alerts"
import { CashFlowChart, ExpenseDonutChart } from "@/components/dashboard-charts"
import Link from "next/link"

export const metadata = {
  title: "Oversikt | Bokført",
}

// ─── Date helpers ───────────────────────────────────────────────────────────

function getMonthRange(offset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + offset + 1,
    0,
    23,
    59,
    59,
    999
  )
  return { start, end }
}

function getLast6Months() {
  const now = new Date()
  const labels = [
    "JAN", "FEB", "MAR", "APR", "MAI", "JUN",
    "JUL", "AUG", "SEP", "OKT", "NOV", "DES",
  ]
  const months: { start: Date; end: Date; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    months.push({ start, end, label: labels[d.getMonth()] })
  }
  return months
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return 100
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { team } = await getCurrentTeam()

  const currentMonth = getMonthRange(0)
  const previousMonth = getMonthRange(-1)
  const last6 = getLast6Months()

  const [
    incomeResult,
    expenseResult,
    prevIncomeResult,
    prevExpenseResult,
    outstandingInvoices,
    overdueThisWeek,
    recentExpenses,
    recentIncomes,
    expensesByCategory,
    monthlyIncomes,
    monthlyExpenses,
  ] = await Promise.all([
    // Current month income
    db.income.aggregate({
      where: { teamId: team.id, date: { gte: currentMonth.start, lte: currentMonth.end } },
      _sum: { amount: true },
    }),
    // Current month expenses
    db.expense.aggregate({
      where: { teamId: team.id, date: { gte: currentMonth.start, lte: currentMonth.end } },
      _sum: { amount: true },
    }),
    // Previous month income
    db.income.aggregate({
      where: { teamId: team.id, date: { gte: previousMonth.start, lte: previousMonth.end } },
      _sum: { amount: true },
    }),
    // Previous month expenses
    db.expense.aggregate({
      where: { teamId: team.id, date: { gte: previousMonth.start, lte: previousMonth.end } },
      _sum: { amount: true },
    }),
    // Outstanding invoices (SENT or OVERDUE)
    db.invoice.aggregate({
      where: { teamId: team.id, status: { in: ["SENT", "OVERDUE"] } },
      _sum: { total: true },
      _count: true,
    }),
    // Invoices due this week
    db.invoice.count({
      where: {
        teamId: team.id,
        status: { in: ["SENT", "OVERDUE"] },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    // Recent expenses
    db.expense.findMany({
      where: { teamId: team.id },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
    // Recent incomes
    db.income.findMany({
      where: { teamId: team.id },
      orderBy: { date: "desc" },
      take: 5,
    }),
    // Expenses grouped by category this month
    db.expense.groupBy({
      by: ["categoryId"],
      where: { teamId: team.id, date: { gte: currentMonth.start, lte: currentMonth.end } },
      _sum: { amount: true },
    }),
    // All incomes for last 6 months (for chart)
    db.income.findMany({
      where: {
        teamId: team.id,
        date: { gte: last6[0].start, lte: last6[last6.length - 1].end },
      },
      select: { amount: true, date: true },
    }),
    // All expenses for last 6 months (for chart)
    db.expense.findMany({
      where: {
        teamId: team.id,
        date: { gte: last6[0].start, lte: last6[last6.length - 1].end },
      },
      select: { amount: true, date: true },
    }),
  ])

  // ─── Computed values ────────────────────────────────────────────────────

  const totalIncome = incomeResult._sum.amount ?? 0
  const totalExpenses = expenseResult._sum.amount ?? 0
  const profit = totalIncome - totalExpenses
  const prevIncome = prevIncomeResult._sum.amount ?? 0
  const prevExpense = prevExpenseResult._sum.amount ?? 0
  const prevProfit = prevIncome - prevExpense
  const outstandingCount = outstandingInvoices._count ?? 0
  const outstandingTotal = outstandingInvoices._sum.total ?? 0

  const incomeChange = percentChange(totalIncome, prevIncome)
  const expenseChange = percentChange(totalExpenses, prevExpense)
  const profitChange = percentChange(profit, prevProfit)

  // ─── Cash flow chart data ─────────────────────────────────────────────

  const cashFlowData = last6.map((m) => {
    const mIncome = monthlyIncomes
      .filter((inc) => {
        const d = new Date(inc.date)
        return d >= m.start && d <= m.end
      })
      .reduce((sum, inc) => sum + inc.amount, 0)
    const mExpense = monthlyExpenses
      .filter((exp) => {
        const d = new Date(exp.date)
        return d >= m.start && d <= m.end
      })
      .reduce((sum, exp) => sum + exp.amount, 0)
    return {
      label: m.label,
      income: mIncome / 100,
      expense: mExpense / 100,
    }
  })

  const hasCashFlowData = cashFlowData.some(
    (d) => d.income !== 0 || d.expense !== 0
  )

  // ─── Expense categories (donut chart) ─────────────────────────────────

  const categoryIds = expensesByCategory
    .map((e) => e.categoryId)
    .filter((id): id is string => id !== null)

  const categories =
    categoryIds.length > 0
      ? await db.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : []

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const expenseCategoryData = expensesByCategory
    .map((e) => ({
      name: e.categoryId
        ? (categoryMap.get(e.categoryId) ?? "Ukjent")
        : "Ukategorisert",
      amount: e._sum.amount ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const totalCategoryExpenses = expenseCategoryData.reduce(
    (sum, c) => sum + c.amount,
    0
  )

  // Group into top 2 + "Andre"
  const topCategories = expenseCategoryData.slice(0, 2)
  const othersAmount = expenseCategoryData
    .slice(2)
    .reduce((sum, c) => sum + c.amount, 0)
  if (othersAmount > 0) {
    topCategories.push({ name: "Andre", amount: othersAmount })
  }

  const donutData = topCategories.map((cat) => ({
    name: cat.name,
    amount: cat.amount / 100,
    percentage:
      totalCategoryExpenses > 0
        ? Math.round((cat.amount / totalCategoryExpenses) * 100)
        : 0,
    color: "", // colors assigned by the component
  }))

  // ─── Recent transactions ──────────────────────────────────────────────

  type Transaction = {
    id: string
    date: Date
    description: string
    category: string
    type: "income" | "expense"
    amount: number
  }

  const recentTransactions: Transaction[] = [
    ...recentExpenses.map((e) => ({
      id: e.id,
      date: e.date,
      description: e.description,
      category: e.category?.name ?? "Ukategorisert",
      type: "expense" as const,
      amount: -e.amount,
    })),
    ...recentIncomes.map((inc) => ({
      id: inc.id,
      date: inc.date,
      description: inc.description,
      category: inc.source ?? "Inntekt",
      type: "income" as const,
      amount: inc.amount,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)

  // ─── Progress bar widths ──────────────────────────────────────────────

  const maxStatValue = Math.max(
    totalIncome,
    totalExpenses,
    Math.abs(profit),
    outstandingTotal,
    1
  )
  const incomeBarPct = Math.min((totalIncome / maxStatValue) * 100, 100)
  const expenseBarPct = Math.min((totalExpenses / maxStatValue) * 100, 100)
  const profitBarPct = Math.min((Math.abs(profit) / maxStatValue) * 100, 100)

  // ─── Short currency formatter for donut center ────────────────────────

  function formatShort(ore: number): string {
    const kr = Math.abs(ore) / 100
    if (kr >= 1_000_000) return `${(kr / 1_000_000).toFixed(1)}M kr`
    if (kr >= 1_000) return `${(kr / 1_000).toFixed(1)}k kr`
    return `${kr.toFixed(0)} kr`
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Anomaly alerts */}
      <AnomalyAlerts />

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase">Inntekter denne mnd.</p>
            {incomeChange !== null && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  incomeChange >= 0
                    ? "text-primary bg-primary/10"
                    : "text-red-500 bg-red-50"
                }`}
              >
                {incomeChange >= 0 ? "+" : ""}
                {incomeChange}%
              </span>
            )}
          </div>
          <h3
            className="text-slate-900 leading-none tracking-tight"
            style={{
              fontFamily: "var(--font-fraunces)",
              fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {formatCurrency(totalIncome)}
          </h3>
          <div className="mt-5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-700" style={{ width: `${incomeBarPct}%` }} />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase">Utgifter denne mnd.</p>
            {expenseChange !== null && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  expenseChange <= 0
                    ? "text-primary bg-primary/10"
                    : "text-red-500 bg-red-50"
                }`}
              >
                {expenseChange >= 0 ? "+" : ""}
                {expenseChange}%
              </span>
            )}
          </div>
          <h3
            className="text-slate-900 leading-none tracking-tight"
            style={{
              fontFamily: "var(--font-fraunces)",
              fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {formatCurrency(totalExpenses)}
          </h3>
          <div className="mt-5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="bg-slate-300 h-full transition-all duration-700" style={{ width: `${expenseBarPct}%` }} />
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase">Resultat denne mnd.</p>
            {profitChange !== null && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  profitChange >= 0
                    ? "text-primary bg-primary/10"
                    : "text-red-500 bg-red-50"
                }`}
              >
                {profitChange >= 0 ? "+" : ""}
                {profitChange}%
              </span>
            )}
          </div>
          <h3
            className="text-slate-900 leading-none tracking-tight"
            style={{
              fontFamily: "var(--font-fraunces)",
              fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {formatCurrency(profit)}
          </h3>
          <div className="mt-5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-700" style={{ width: `${profitBarPct}%` }} />
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-primary/5 p-7 rounded-2xl border border-primary/15 shadow-sm">
          <div className="flex justify-between items-start mb-5">
            <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase">Utestående fakturaer</p>
            <span className="text-primary font-bold text-sm bg-primary/10 px-2.5 py-1 rounded-full">{outstandingCount}</span>
          </div>
          <h3
            className="text-slate-900 leading-none tracking-tight"
            style={{
              fontFamily: "var(--font-fraunces)",
              fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {formatCurrency(outstandingTotal)}
          </h3>
          {overdueThisWeek > 0 ? (
            <p className="text-xs text-primary font-semibold mt-5">
              {overdueThisWeek} forfaller denne uken
            </p>
          ) : (
            <p className="text-xs text-primary font-semibold mt-5">
              {outstandingCount === 1 ? "1 faktura" : `${outstandingCount} fakturaer`}
            </p>
          )}
        </div>
      </div>

      {/* ── Charts Row: Cash Flow + Expense Categories ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 bg-white p-7 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2
                className="text-slate-900 leading-none"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  fontSize: "clamp(1.25rem, 1.75vw, 1.5rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                Kontantstrøm
              </h2>
              <p className="text-slate-400 text-sm mt-1.5">
                Månedlig ytelse siste 6 mnd.
              </p>
            </div>
            <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:ring-primary focus:border-primary bg-white">
              <option>Siste 6 måneder</option>
              <option>Siste år</option>
            </select>
          </div>
          {hasCashFlowData ? (
            <CashFlowChart
              data={cashFlowData}
              formatAmount={(val) =>
                new Intl.NumberFormat("nb-NO", {
                  style: "currency",
                  currency: "NOK",
                  minimumFractionDigits: 0,
                }).format(val)
              }
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <TrendingUp className="mb-3 size-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                Ingen kontantstrøm-data ennå.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Registrer inntekter og utgifter for å se grafen.
              </p>
            </div>
          )}
        </div>

        {/* Expense Categories Donut */}
        <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm">
          <h2
            className="text-slate-900 leading-none mb-1.5"
            style={{
              fontFamily: "var(--font-fraunces)",
              fontSize: "clamp(1.25rem, 1.75vw, 1.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            Utgiftskategorier
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            Fordeling denne måneden
          </p>
          {donutData.length > 0 && totalCategoryExpenses > 0 ? (
            <ExpenseDonutChart
              categories={donutData}
              totalFormatted={formatShort(totalCategoryExpenses)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="mb-3 size-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                Ingen utgifter denne måneden.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Registrer utgifter for å se fordeling.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Transactions ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between">
          <h2
            className="text-slate-900 leading-none"
            style={{
              fontFamily: "var(--font-fraunces)",
              fontSize: "clamp(1.25rem, 1.75vw, 1.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            Siste transaksjoner
          </h2>
          <Link
            href="/utgifter"
            className="text-primary text-sm font-semibold hover:underline"
          >
            Se alle
          </Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                  <th className="px-7 py-4">Dato</th>
                  <th className="px-7 py-4">Beskrivelse</th>
                  <th className="px-7 py-4 hidden md:table-cell">Kategori</th>
                  <th className="px-7 py-4 hidden sm:table-cell">Status</th>
                  <th className="px-7 py-4 text-right">Beløp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-7 py-4 text-sm text-slate-400 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-7 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === "income"
                              ? "bg-primary/10 text-primary"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {tx.type === "income" ? (
                            <ArrowUpCircle className="size-[18px]" />
                          ) : (
                            <ArrowDownCircle className="size-[18px]" />
                          )}
                        </div>
                        <span className="text-[0.9375rem] font-semibold text-slate-900 leading-tight">
                          {tx.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-7 py-4 hidden md:table-cell">
                      <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-7 py-4 hidden sm:table-cell">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <span className="size-1.5 rounded-full bg-primary" />
                        Fullført
                      </span>
                    </td>
                    <td
                      className={`px-7 py-4 text-right whitespace-nowrap font-bold ${
                        tx.amount >= 0 ? "text-primary" : "text-slate-700"
                      }`}
                      style={{
                        fontFamily: "var(--font-fraunces)",
                        fontSize: "0.9375rem",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {formatCurrency(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 size-12 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900">
              Ingen transaksjoner ennå
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Registrer inntekter og utgifter for å se dem her.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
