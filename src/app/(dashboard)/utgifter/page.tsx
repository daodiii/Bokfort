import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  TrendingUp,
  ArrowUp,
  BarChart3,
  Tag,
  Receipt,
  Cloud,
  Building2,
  Plane,
  Megaphone,
  ShoppingCart,
  Wallet,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { WeeklyTrendChart, SpendingDonut, TransactionSearch } from "./expense-charts"

export const metadata = {
  title: "Utgifter | Bokfort",
}

/* ---------- helpers ---------- */

/** Resolve a category name to a consistent color pair [bg, text] */
function categoryColor(name: string): [string, string] {
  const n = name.toLowerCase()
  if (n.includes("program") || n.includes("software") || n.includes("it"))
    return ["bg-blue-100 dark:bg-blue-900/30", "text-blue-700 dark:text-blue-400"]
  if (n.includes("leie") || n.includes("husleie") || n.includes("kontor") || n.includes("rent"))
    return ["bg-amber-100 dark:bg-amber-900/30", "text-amber-700 dark:text-amber-400"]
  if (n.includes("reise") || n.includes("transport") || n.includes("travel"))
    return ["bg-purple-100 dark:bg-purple-900/30", "text-purple-700 dark:text-purple-400"]
  if (n.includes("markeds") || n.includes("reklame") || n.includes("marketing"))
    return ["bg-rose-100 dark:bg-rose-900/30", "text-rose-700 dark:text-rose-400"]
  if (n.includes("lonn") || n.includes("payroll") || n.includes("personal"))
    return ["bg-emerald-100 dark:bg-emerald-900/30", "text-emerald-700 dark:text-emerald-400"]
  if (n.includes("forsikr"))
    return ["bg-cyan-100 dark:bg-cyan-900/30", "text-cyan-700 dark:text-cyan-400"]
  return ["bg-slate-100 dark:bg-slate-800", "text-slate-700 dark:text-slate-300"]
}

/** Resolve a category name to a lucide icon */
function categoryIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes("program") || n.includes("software") || n.includes("it")) return Cloud
  if (n.includes("leie") || n.includes("husleie") || n.includes("kontor") || n.includes("rent")) return Building2
  if (n.includes("reise") || n.includes("transport") || n.includes("travel")) return Plane
  if (n.includes("markeds") || n.includes("reklame") || n.includes("marketing")) return Megaphone
  if (n.includes("lonn") || n.includes("payroll") || n.includes("personal")) return Wallet
  return ShoppingCart
}

/* Donut chart colours */
const DONUT_COLORS = [
  "oklch(0.55 0.17 160)",
  "oklch(0.65 0.15 160)",
  "#94a3b8",
  "#818cf8",
  "#f472b6",
]

export default async function UtgifterPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; sok?: string }>
}) {
  const { team } = await getCurrentTeam()
  const params = await searchParams
  const categoryFilter = params.kategori ?? ""
  const searchQuery = params.sok ?? ""

  /* ---- Current month boundaries ---- */
  const now = new Date()

  /* ---- Previous month boundaries ---- */
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  /* ---- Data fetching ---- */
  const [allExpenses, prevMonthExpenses] = await Promise.all([
    db.expense.findMany({
      where: {
        teamId: team.id,
        ...(categoryFilter ? { categoryId: categoryFilter } : {}),
      },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    db.expense.findMany({
      where: {
        teamId: team.id,
        date: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
      select: { amount: true },
    }),
  ])

  /* ---- Apply search filter ---- */
  const expenses = searchQuery
    ? allExpenses.filter(
        (e) =>
          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.category?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allExpenses

  /* ---- Computed analytics ---- */
  const totalAmount = allExpenses.reduce((s, e) => s + e.amount, 0)
  const prevTotal = prevMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const momChange = totalAmount - prevTotal
  const momPct = prevTotal > 0 ? ((momChange / prevTotal) * 100).toFixed(1) : "0.0"

  /* Category breakdown (top N for donut) */
  const catMap = new Map<string, { name: string; total: number }>()
  for (const e of allExpenses) {
    const key = e.category?.name ?? "Ukategorisert"
    const prev = catMap.get(key) ?? { name: key, total: 0 }
    prev.total += e.amount
    catMap.set(key, prev)
  }
  const catBreakdown = Array.from(catMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const topCategory = catBreakdown[0]
  const topCatPct = totalAmount > 0 ? Math.round((topCategory?.total ?? 0) / totalAmount * 100) : 0

  /* Weekly trend (last 4 weeks) */
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const weeklyTotals = [0, 0, 0, 0]
  for (const e of allExpenses) {
    const d = new Date(e.date)
    if (d >= fourWeeksAgo) {
      const daysDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
      const weekIdx = 3 - Math.min(3, Math.floor(daysDiff / 7))
      weeklyTotals[weekIdx] += e.amount
    }
  }

  /* Daily trend (last 7 days) */
  const dayNames = ["Son", "Man", "Tir", "Ons", "Tor", "Fre", "Lor"]
  const dailyData: { label: string; value: number }[] = []
  for (let d = 6; d >= 0; d--) {
    const date = new Date(now)
    date.setDate(date.getDate() - d)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
    const dayTotal = allExpenses
      .filter((e) => e.date >= dayStart && e.date <= dayEnd)
      .reduce((s, e) => s + e.amount, 0)
    dailyData.push({
      label: dayNames[date.getDay()],
      value: Math.round(dayTotal / 100),
    })
  }

  const weeklyData = weeklyTotals.map((t, i) => ({
    label: `Uke ${i + 1}`,
    value: Math.round(t / 100),
  }))

  /* Donut chart data */
  const donutCategories = catBreakdown.map((c, i) => ({
    name: c.name,
    amount: Math.round(c.total / 100),
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  /* Short currency for donut centre */
  function shortCurrency(ore: number): string {
    const kr = ore / 100
    if (kr >= 1_000_000) return `${(kr / 1_000_000).toFixed(1)}M kr`
    if (kr >= 1_000) return `${Math.round(kr / 1000)}k kr`
    return `${Math.round(kr)} kr`
  }

  const hasExpenses = expenses.length > 0

  return (
    <div className="space-y-8">
      {/* ===== Metric Cards ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Expenses */}
          <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Totale utgifter</p>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="size-5 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {formatCurrency(totalAmount)}
            </h3>
            <div className="flex items-center gap-1.5">
              {prevTotal > 0 && (
                <>
                  <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs font-bold flex items-center gap-0.5">
                    <TrendingUp className="size-3" />
                    {Math.abs(parseFloat(momPct))}%
                  </span>
                  <span className="text-slate-400 text-xs tracking-tight">vs. forrige mnd</span>
                </>
              )}
            </div>
          </div>

          {/* MoM Change */}
          <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Endring mnd/mnd</p>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <BarChart3 className="size-5 text-slate-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {momChange >= 0 ? "+" : ""}{formatCurrency(momChange)}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs font-bold flex items-center gap-0.5">
                <ArrowUp className="size-3" />
                {Math.abs(parseFloat(momPct))}%
              </span>
              <span className="text-slate-400 text-xs tracking-tight">gjennomsnittlig vekst</span>
            </div>
          </div>

          {/* Top Category */}
          <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Topp-kategori</p>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Tag className="size-5 text-slate-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {topCategory?.name ?? "-"}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-bold">
                {topCatPct}% av totalt
              </span>
              {topCategory && (
                <span className="text-slate-400 text-xs tracking-tight">
                  {formatCurrency(topCategory.total)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ===== Analysis Charts ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Donut Chart Card */}
          <div className="lg:col-span-1 bg-white border border-slate-100 p-6 rounded-xl shadow-sm flex flex-col">
            <h4 className="font-bold text-lg mb-6">Fordeling</h4>
            {donutCategories.length > 0 ? (
              <SpendingDonut
                categories={donutCategories}
                totalLabel={shortCurrency(totalAmount)}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Ingen data
              </div>
            )}
          </div>

          {/* Bar Chart Card */}
          <div className="lg:col-span-2 bg-white border border-slate-100 p-6 rounded-xl shadow-sm flex flex-col">
            <WeeklyTrendChart weeklyData={weeklyData} dailyData={dailyData} />
          </div>
        </div>

        {/* ===== Transaction Table ===== */}
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-bold text-lg">Siste transaksjoner</h4>
            <TransactionSearch defaultValue={searchQuery} />
          </div>

          {hasExpenses ? (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Dato</th>
                      <th className="px-6 py-4">Beskrivelse</th>
                      <th className="px-6 py-4">Kategori</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Belop</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.slice(0, 10).map((expense) => {
                      const catName = expense.category?.name ?? "Ukategorisert"
                      const [bgClass, textClass] = categoryColor(catName)
                      const Icon = categoryIcon(catName)

                      return (
                        <tr
                          key={expense.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            {formatDate(expense.date)}
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/utgifter/${expense.id}`}
                              className="flex items-center gap-3 hover:underline"
                            >
                              <div className="size-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Icon className="size-4 text-slate-600 dark:text-slate-400" />
                              </div>
                              <span className="text-sm font-semibold">{expense.description}</span>
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 rounded text-[11px] font-bold uppercase ${bgClass} ${textClass}`}
                            >
                              {catName}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className="size-1.5 rounded-full bg-primary" />
                              <span className="text-sm">Betalt</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-sm">
                            -{formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Viser 1-{Math.min(10, expenses.length)} av {allExpenses.length} transaksjoner
                </p>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded border border-transparent hover:border-slate-300 transition-all disabled:opacity-50"
                    disabled
                  >
                    Forrige
                  </button>
                  <button className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded border border-transparent hover:border-slate-300 transition-all">
                    Neste
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Receipt className="mb-4 size-12 text-slate-400/50" />
              <h3 className="text-lg font-medium">
                {categoryFilter || searchQuery ? "Ingen treff" : "Ingen utgifter enna"}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {categoryFilter || searchQuery
                  ? "Prov a endre filtreringen eller soket."
                  : "Registrer din forste utgift for a holde oversikt over kostnadene dine."}
              </p>
              {!categoryFilter && !searchQuery && (
                <Link
                  href="/utgifter/ny"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary/90"
                >
                  <Plus className="size-4" />
                  Ny utgift
                </Link>
              )}
            </div>
          )}
        </div>
    </div>
  )
}
