import { getCurrentTeam } from "@/lib/auth-utils"
import { getTrialBalance } from "@/actions/accounting"
import { formatCurrency } from "@/lib/utils"
import { Scale } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Saldobalanse | Bokført",
}

export default async function SaldobalansePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { team } = await getCurrentTeam()
  const params = await searchParams

  const currentYear = new Date().getFullYear()
  const fiscalYear = params.year ? parseInt(params.year) : currentYear

  if (!team.chartSeeded) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Saldobalanse</h1>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <Scale className="size-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">Kontoplan må opprettes først</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Gå til kontoplan-siden for å sette opp NS 4102 standard kontoplan.
          </p>
          <Link
            href="/regnskap/kontoplan"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Sett opp kontoplan
          </Link>
        </div>
      </div>
    )
  }

  const rows = await getTrialBalance({ fiscalYear })

  const totalDebit = rows.reduce((s, r) => s + r.totalDebit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.totalCredit, 0)
  const isBalanced = totalDebit === totalCredit

  // Group by account type for section headers
  const typeOrder = ["ASSET", "EQUITY", "LIABILITY", "REVENUE", "EXPENSE"] as const
  const typeLabels: Record<string, string> = {
    ASSET: "Eiendeler",
    EQUITY: "Egenkapital",
    LIABILITY: "Gjeld",
    REVENUE: "Inntekter",
    EXPENSE: "Kostnader",
  }

  const grouped = typeOrder
    .map((type) => ({
      type,
      label: typeLabels[type],
      rows: rows.filter((r) => r.accountType === type),
    }))
    .filter((g) => g.rows.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saldobalanse</h1>
          <p className="text-slate-500 mt-1">
            Oversikt over alle kontoer med debet- og kredittsaldo for {fiscalYear}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {[currentYear - 1, currentYear].map((yr) => (
            <Link
              key={yr}
              href={`/regnskap/saldobalanse?year=${yr}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                yr === fiscalYear
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {yr}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total debet</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalDebit)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total kredit</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalCredit)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p>
          <p className={`text-xl font-bold mt-1 ${isBalanced ? "text-emerald-600" : "text-red-600"}`}>
            {isBalanced ? "Balansert ✓" : `Differanse: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <Scale className="size-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">Ingen posteringer ennå</h3>
          <p className="text-sm text-slate-500 mt-1">
            Registrer fakturaer, utgifter eller lønn for å se saldobalansen.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-slate-500 font-medium w-24">Konto</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Kontonavn</th>
                <th className="text-right px-5 py-3 text-slate-500 font-medium w-36">Debet</th>
                <th className="text-right px-5 py-3 text-slate-500 font-medium w-36">Kredit</th>
                <th className="text-right px-5 py-3 text-slate-500 font-medium w-36">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((group) => (
                <>
                  <tr key={`header-${group.type}`} className="bg-slate-50/70">
                    <td colSpan={5} className="px-5 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                      {group.label}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.accountCode} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-5 py-2.5 font-mono text-slate-600 font-medium">
                        {row.accountCode}
                      </td>
                      <td className="px-5 py-2.5 text-slate-800">
                        {row.accountName}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-slate-700">
                        {row.totalDebit > 0 ? formatCurrency(row.totalDebit) : "–"}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-slate-700">
                        {row.totalCredit > 0 ? formatCurrency(row.totalCredit) : "–"}
                      </td>
                      <td className={`px-5 py-2.5 text-right font-mono font-medium ${row.balance >= 0 ? "text-slate-900" : "text-red-600"}`}>
                        {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                <td colSpan={2} className="px-5 py-3 text-slate-800">Totalt</td>
                <td className="px-5 py-3 text-right font-mono text-slate-900">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="px-5 py-3 text-right font-mono text-slate-900">
                  {formatCurrency(totalCredit)}
                </td>
                <td className={`px-5 py-3 text-right font-mono ${isBalanced ? "text-emerald-600" : "text-red-600"}`}>
                  {isBalanced ? "0" : formatCurrency(Math.abs(totalDebit - totalCredit))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
