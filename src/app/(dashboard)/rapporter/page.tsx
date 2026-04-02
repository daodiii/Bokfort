import { getProfitAndLoss } from "@/actions/reports"
import { formatCurrency } from "@/lib/utils"
import {
  FileText,
  CreditCard,
  Landmark,
  Users,
  ChevronRight,
  Download,
  BookOpen,
} from "lucide-react"
import Link from "next/link"
import { DateRangeSelector } from "./date-range-selector"
import { RevenueExpensesChart } from "./revenue-expenses-chart"

export const metadata = {
  title: "Rapporter | Bokfort",
}

function getDefaultDates() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31)
  return {
    from: startOfYear.toISOString().split("T")[0],
    to: endOfYear.toISOString().split("T")[0],
  }
}

const reportCategories = [
  {
    title: "Arsregnskap",
    description: "Resultatregnskap og balanse for aret",
    href: "/rapporter/arsregnskap",
    icon: BookOpen,
  },
  {
    title: "MVA-oppgave",
    description: "MVA, skatt og innberetninger",
    href: "/rapporter/mva",
    icon: FileText,
  },
  {
    title: "Utgiftsanalyse",
    description: "Kostnadsfordeling per kategori",
    href: "/rapporter/resultat",
    icon: CreditCard,
  },
  {
    title: "Kontoutskrifter",
    description: "Bankavstemmingssammendrag",
    href: "/rapporter/resultat",
    icon: Landmark,
  },
  {
    title: "Leverandoroversikt",
    description: "Topp partnere og leverandorgjeld",
    href: "/rapporter/resultat",
    icon: Users,
  },
]

export default async function RapporterPage({
  searchParams,
}: {
  searchParams: Promise<{ fra?: string; til?: string }>
}) {
  const params = await searchParams
  const defaults = getDefaultDates()
  const fra = params.fra || defaults.from
  const til = params.til || defaults.to

  const startDate = new Date(fra + "T00:00:00")
  const endDate = new Date(til + "T23:59:59.999")

  const report = await getProfitAndLoss(startDate, endDate)

  const netProfit = report.profit
  const totalRevenue = report.totalIncome
  const totalExpenses = report.totalExpenses

  // Compute progress bar widths as a fraction (capped at 1)
  const maxVal = Math.max(totalRevenue, totalExpenses, Math.abs(netProfit), 1)
  const profitWidth = Math.min(Math.abs(netProfit) / maxVal, 1)
  const revenueWidth = Math.min(totalRevenue / maxVal, 1)
  const expensesWidth = Math.min(totalExpenses / maxVal, 1)

  // Top expense categories for the P&L summary (up to 3)
  const topExpenses = report.expenses.slice(0, 3)
  const grossProfit = totalRevenue - topExpenses.reduce((s, e) => s + e.total, 0)
  const operatingExpenses =
    totalExpenses - topExpenses.reduce((s, e) => s + e.total, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rapporter</h2>
          <p className="text-slate-500 text-sm mt-1">
            Analyser bedriftens ytelse over tid.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector
            defaultFrom={fra}
            defaultTo={til}
            basePath="/rapporter"
          />
          <button className="bg-primary text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
            <Download className="size-4" />
            <span>Eksporter</span>
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Net Profit */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium">Nettoresultat</p>
            <span
              className={`text-xs font-bold px-2 py-1 rounded ${
                netProfit >= 0
                  ? "bg-primary/10 text-primary"
                  : "bg-red-500/10 text-red-500"
              }`}
            >
              {netProfit >= 0 ? "+" : ""}
              {totalRevenue > 0
                ? ((netProfit / totalRevenue) * 100)
                    .toFixed(1)
                    .replace(".", ",")
                : "0,0"}
              %
            </span>
          </div>
          <p className="text-2xl font-black">{formatCurrency(netProfit)}</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
            <div
              className={`h-1.5 rounded-full ${
                netProfit >= 0 ? "bg-primary" : "bg-red-500"
              }`}
              style={{ width: `${profitWidth * 100}%` }}
            />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium">
              Totale inntekter
            </p>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
              +4,3%
            </span>
          </div>
          <p className="text-2xl font-black">{formatCurrency(totalRevenue)}</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
            <div
              className="bg-primary h-1.5 rounded-full"
              style={{ width: `${revenueWidth * 100}%` }}
            />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-sm font-medium">
              Totale utgifter
            </p>
            <span className="bg-red-500/10 text-red-500 text-xs font-bold px-2 py-1 rounded">
              -2,1%
            </span>
          </div>
          <p className="text-2xl font-black">
            {formatCurrency(totalExpenses)}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
            <div
              className="bg-red-500 h-1.5 rounded-full"
              style={{ width: `${expensesWidth * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <RevenueExpensesChart />

      {/* Lower Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profit and Loss Summary */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full">
          <h3 className="text-lg font-bold mb-6">Resultatsammendrag</h3>
          <div className="space-y-4 flex-1">
            {/* Gross Sales */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Brutto salg</span>
              <span className="font-bold">{formatCurrency(totalRevenue)}</span>
            </div>

            {/* Top expense categories as cost items */}
            {topExpenses.map((expense) => (
              <div
                key={expense.category}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-slate-500">{expense.category}</span>
                <span className="font-bold">
                  -{formatCurrency(expense.total)}
                </span>
              </div>
            ))}

            {/* Gross Profit divider */}
            <div className="border-t border-slate-100 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="font-bold">Bruttofortjeneste</span>
                <span className="font-black text-primary text-lg">
                  {formatCurrency(grossProfit)}
                </span>
              </div>
            </div>

            {/* Operating Expenses */}
            {operatingExpenses > 0 && (
              <div className="flex justify-between items-center text-sm mt-4">
                <span className="text-slate-500">Driftskostnader</span>
                <span className="font-bold">
                  -{formatCurrency(operatingExpenses)}
                </span>
              </div>
            )}
          </div>
          <Link
            href="/rapporter/arsregnskap"
            className="w-full mt-8 py-2.5 bg-slate-50 text-slate-900 font-bold text-sm rounded-lg hover:bg-slate-100 transition-colors block text-center"
          >
            Se fullstendig regnskap
          </Link>
        </div>

        {/* Report Categories */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold">Hurtigrapporter</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reportCategories.map((cat) => {
              const Icon = cat.icon
              return (
                <Link key={cat.title} href={cat.href}>
                  <div className="group bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-primary/50 transition-all cursor-pointer">
                    <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold">{cat.title}</p>
                      <p className="text-xs text-slate-500">
                        {cat.description}
                      </p>
                    </div>
                    <ChevronRight className="size-5 text-slate-300 ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
