import { getAnnualReport, getAvailableYears } from "@/actions/annual-report"
import { formatCurrency, formatOrgNumber } from "@/lib/utils"
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button-variants"
import { YearSelector } from "./year-selector"

export const metadata = {
  title: "Arsregnskap | Bokfort",
}

export default async function ArsregnskapPage({
  searchParams,
}: {
  searchParams: Promise<{ ar?: string }>
}) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const year = params.ar ? parseInt(params.ar, 10) : currentYear

  const [report, availableYears] = await Promise.all([
    getAnnualReport(year),
    getAvailableYears(),
  ])

  const { resultatregnskap, balanse, metrics, monthlyBreakdown, yearOverYear } =
    report

  const currentMonth = new Date().getMonth() // 0-indexed

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/rapporter"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight text-slate-900"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Arsregnskap {year}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Resultatregnskap og balanse for regnskapsaret
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <YearSelector years={availableYears} currentYear={year} />
          <button
            disabled
            className="bg-slate-100 text-slate-400 font-medium text-sm px-4 py-2 rounded-lg flex items-center gap-2 cursor-not-allowed"
            title="PDF-eksport kommer snart"
          >
            <Download className="size-4" />
            <span>Eksporter PDF</span>
          </button>
        </div>
      </header>

      {/* Company info bar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-slate-900">{report.companyName}</p>
          {report.orgNumber && (
            <p className="text-sm text-slate-500">
              Org.nr. {formatOrgNumber(report.orgNumber)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Regnskapsar</p>
          <p className="text-lg font-bold text-slate-900">
            01.01.{year} &ndash; 31.12.{year}
          </p>
        </div>
      </div>

      {/* ===== KEY METRICS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Totale inntekter"
          value={metrics.totalRevenue}
          yoyChange={yearOverYear?.revenueChange}
        />
        <MetricCard
          label="Totale kostnader"
          value={metrics.totalExpenses}
          yoyChange={yearOverYear?.expensesChange}
          invertColor
        />
        <MetricCard
          label="Nettoresultat"
          value={metrics.netProfit}
          yoyChange={yearOverYear?.netProfitChange}
          highlight
        />
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Resultatmargin
          </p>
          <p
            className={`text-2xl font-black mt-1 ${
              metrics.profitMarginPercent >= 0
                ? "text-emerald-600"
                : "text-red-600"
            }`}
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {metrics.profitMarginPercent.toFixed(1).replace(".", ",")}%
          </p>
          {yearOverYear && (
            <p className="text-xs text-slate-400 mt-1">
              Forrige ar:{" "}
              {yearOverYear.previousRevenue > 0
                ? (
                    (yearOverYear.previousNetProfit /
                      yearOverYear.previousRevenue) *
                    100
                  )
                    .toFixed(1)
                    .replace(".", ",")
                : "0,0"}
              %
            </p>
          )}
        </div>
      </div>

      {/* ===== RESULTATREGNSKAP ===== */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2
            className="text-xl font-bold text-slate-900"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Resultatregnskap
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            For regnskapsaret {year}
          </p>
        </div>

        <div className="divide-y divide-slate-50">
          {/* Driftsinntekter */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Driftsinntekter
            </h3>
            <div className="space-y-2">
              {resultatregnskap.driftsinntekter.inntekter.map((item) => (
                <LineItem
                  key={item.category}
                  label={item.category}
                  amount={item.total}
                  indent
                />
              ))}
              {resultatregnskap.driftsinntekter.fakturainntekter > 0 && (
                <LineItem
                  label="Fakturainntekter"
                  amount={resultatregnskap.driftsinntekter.fakturainntekter}
                  indent
                />
              )}
              <LineItem
                label="Sum driftsinntekter"
                amount={resultatregnskap.driftsinntekter.totalDriftsinntekter}
                bold
                borderTop
              />
            </div>
          </div>

          {/* Driftskostnader */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Driftskostnader
            </h3>
            <div className="space-y-2">
              {resultatregnskap.driftskostnader.kategorier.map((item) => (
                <LineItem
                  key={item.category}
                  label={item.category}
                  amount={-item.total}
                  indent
                />
              ))}
              <LineItem
                label="Sum driftskostnader"
                amount={-resultatregnskap.driftskostnader.totalDriftskostnader}
                bold
                borderTop
              />
            </div>
          </div>

          {/* Lonnskostnader */}
          {resultatregnskap.lonnskostnader.totalLonnskostnader > 0 && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                Lonnskostnader
              </h3>
              <div className="space-y-2">
                <LineItem
                  label="Bruttolonn"
                  amount={-resultatregnskap.lonnskostnader.bruttolonn}
                  indent
                />
                <LineItem
                  label="Arbeidsgiveravgift"
                  amount={-resultatregnskap.lonnskostnader.arbeidsgiveravgift}
                  indent
                />
                <LineItem
                  label="Pensjonskostnad"
                  amount={-resultatregnskap.lonnskostnader.pensjon}
                  indent
                />
                <LineItem
                  label="Sum lonnskostnader"
                  amount={-resultatregnskap.lonnskostnader.totalLonnskostnader}
                  bold
                  borderTop
                />
              </div>
            </div>
          )}

          {/* Driftsresultat */}
          <div className="px-6 py-5 bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">
                Driftsresultat
              </span>
              <span
                className={`text-xl font-black tabular-nums ${
                  resultatregnskap.driftsresultat >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {formatCurrency(resultatregnskap.driftsresultat)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MONTHLY BREAKDOWN ===== */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2
            className="text-xl font-bold text-slate-900"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Manedsoversikt
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Inntekter og kostnader per maned
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">
                  Maned
                </th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">
                  Inntekter
                </th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">
                  Kostnader
                </th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">
                  Netto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthlyBreakdown.map((m) => {
                const isCurrentMonth =
                  year === currentYear && m.month - 1 === currentMonth
                return (
                  <tr
                    key={m.month}
                    className={
                      isCurrentMonth
                        ? "bg-primary/5 font-medium"
                        : "hover:bg-slate-50/50"
                    }
                  >
                    <td className="px-6 py-3 text-slate-700">
                      <span className="flex items-center gap-2">
                        {m.monthName}
                        {isCurrentMonth && (
                          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            Na
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-700">
                      {formatCurrency(m.revenue)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-700">
                      {formatCurrency(m.expenses)}
                    </td>
                    <td
                      className={`px-6 py-3 text-right tabular-nums font-semibold ${
                        m.net >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(m.net)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                <td className="px-6 py-3 text-slate-900">Totalt</td>
                <td className="px-6 py-3 text-right tabular-nums text-slate-900">
                  {formatCurrency(
                    monthlyBreakdown.reduce((s, m) => s + m.revenue, 0)
                  )}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-slate-900">
                  {formatCurrency(
                    monthlyBreakdown.reduce((s, m) => s + m.expenses, 0)
                  )}
                </td>
                <td
                  className={`px-6 py-3 text-right tabular-nums font-bold ${
                    metrics.netProfit >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(metrics.netProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ===== BALANSE ===== */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2
            className="text-xl font-bold text-slate-900"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Balanse
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Forenklet balanse per 31.12.{year}
          </p>
        </div>

        <div className="divide-y divide-slate-50">
          <div className="px-6 py-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Eiendeler
            </h3>
            <div className="space-y-2">
              <LineItem
                label="Kundefordringer"
                amount={balanse.eiendeler.kundefordringer}
                indent
              />
              <LineItem
                label="Bank / kontanter"
                amount={balanse.eiendeler.bank}
                indent
              />
              <LineItem
                label="Sum eiendeler"
                amount={balanse.eiendeler.totalEiendeler}
                bold
                borderTop
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== YEAR-OVER-YEAR ===== */}
      {yearOverYear && (
        <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2
              className="text-xl font-bold text-slate-900"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Sammenligning med {yearOverYear.previousYear}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">
                    &nbsp;
                  </th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">
                    {year}
                  </th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">
                    {yearOverYear.previousYear}
                  </th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">
                    Endring
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr>
                  <td className="px-6 py-3 text-slate-700 font-medium">
                    Inntekter
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    {formatCurrency(metrics.totalRevenue)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-slate-500">
                    {formatCurrency(yearOverYear.previousRevenue)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <ChangeIndicator value={yearOverYear.revenueChange} />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-slate-700 font-medium">
                    Kostnader
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    {formatCurrency(metrics.totalExpenses)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-slate-500">
                    {formatCurrency(yearOverYear.previousExpenses)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <ChangeIndicator
                      value={yearOverYear.expensesChange}
                      invert
                    />
                  </td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="px-6 py-3 text-slate-900">Nettoresultat</td>
                  <td
                    className={`px-6 py-3 text-right tabular-nums ${
                      metrics.netProfit >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(metrics.netProfit)}
                  </td>
                  <td
                    className={`px-6 py-3 text-right tabular-nums ${
                      yearOverYear.previousNetProfit >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(yearOverYear.previousNetProfit)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <ChangeIndicator value={yearOverYear.netProfitChange} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Footer note */}
      <div className="text-center pb-4">
        <p className="text-xs text-slate-400">
          Generert {new Date().toLocaleDateString("nb-NO")} &middot; Forenklet
          arsregnskap &middot; Bokfort
        </p>
      </div>
    </div>
  )
}

// --- Sub-components ---

function LineItem({
  label,
  amount,
  indent = false,
  bold = false,
  borderTop = false,
}: {
  label: string
  amount: number
  indent?: boolean
  bold?: boolean
  borderTop?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${
        indent ? "pl-4" : ""
      } ${bold ? "font-bold text-slate-900" : "text-slate-600"} ${
        borderTop ? "border-t border-slate-200 pt-3 mt-1" : ""
      }`}
    >
      <span className="text-sm">{label}</span>
      <span
        className={`text-sm tabular-nums text-right min-w-[120px] ${
          bold ? "font-bold" : "font-medium"
        }`}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  )
}

function MetricCard({
  label,
  value,
  yoyChange,
  highlight = false,
  invertColor = false,
}: {
  label: string
  value: number
  yoyChange?: number
  highlight?: boolean
  invertColor?: boolean
}) {
  const valueColor = highlight
    ? value >= 0
      ? "text-emerald-600"
      : "text-red-600"
    : "text-slate-900"

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-5 ${
        highlight
          ? value >= 0
            ? "border-emerald-200 bg-emerald-50/30"
            : "border-red-200 bg-red-50/30"
          : "border-slate-100"
      }`}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-2xl font-black mt-1 ${valueColor}`}
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {formatCurrency(value)}
      </p>
      {yoyChange !== undefined && yoyChange !== null && (
        <div className="flex items-center gap-1 mt-1.5">
          <YoYBadge value={yoyChange} invert={invertColor} />
        </div>
      )}
    </div>
  )
}

function YoYBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  const absVal = Math.abs(value)
  const isUp = value > 0
  const isGood = invert ? !isUp : isUp

  if (absVal < 0.1) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Minus className="size-3" />
        Uendret
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isGood ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {isUp ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {isUp ? "+" : ""}
      {value.toFixed(1).replace(".", ",")}% fra i fjor
    </span>
  )
}

function ChangeIndicator({
  value,
  invert = false,
}: {
  value: number
  invert?: boolean
}) {
  const absVal = Math.abs(value)
  const isUp = value > 0
  const isGood = invert ? !isUp : isUp

  if (absVal < 0.1) {
    return <span className="text-slate-400 text-sm">&mdash;</span>
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold ${
        isGood ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {isUp ? "+" : ""}
      {value.toFixed(1).replace(".", ",")}%
    </span>
  )
}
