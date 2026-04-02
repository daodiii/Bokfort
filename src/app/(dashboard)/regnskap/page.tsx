import { getCurrentTeam } from "@/lib/auth-utils"
import { getTrialBalance } from "@/actions/accounting"
import { formatCurrency } from "@/lib/utils"
import { BookOpen, ListOrdered, Scale, ChevronRight, FileDown } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Regnskap | Bokført",
}

export default async function RegnskapPage() {
  const { team } = await getCurrentTeam()

  const currentYear = new Date().getFullYear()
  let trialBalance: Awaited<ReturnType<typeof getTrialBalance>> = []
  let totalDebit = 0
  let totalCredit = 0

  if (team.chartSeeded) {
    trialBalance = await getTrialBalance({ fiscalYear: currentYear })
    totalDebit = trialBalance.reduce((s, r) => s + r.totalDebit, 0)
    totalCredit = trialBalance.reduce((s, r) => s + r.totalCredit, 0)
  }

  const navCards = [
    {
      href: "/regnskap/kontoplan",
      icon: BookOpen,
      title: "Kontoplan",
      description: "NS 4102 kontoer for ditt foretak",
      color: "bg-blue-50 text-blue-600",
    },
    {
      href: "/regnskap/bilag",
      icon: ListOrdered,
      title: "Bilag",
      description: "Alle bilagsnummer og posteringer",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      href: "/regnskap/saldobalanse",
      icon: Scale,
      title: "Saldobalanse",
      description: "Debet/kredit per konto",
      color: "bg-amber-50 text-amber-600",
    },
    {
      href: "/regnskap/saft-export",
      icon: FileDown,
      title: "SAF-T Eksport",
      description: "Last ned SAF-T v1.30 XML",
      color: "bg-purple-50 text-purple-600",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hovedbok</h1>
        <p className="text-slate-500 mt-1">
          Dobbelt bokholderi — alle finansielle hendelser blir postert med debet og kredit.
        </p>
      </div>

      {/* Navigation cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {navCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:shadow-md hover:border-slate-200"
          >
            <div className="flex items-start justify-between">
              <div className={`rounded-xl p-2.5 ${card.color}`}>
                <card.icon className="size-5" />
              </div>
              <ChevronRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
            </div>
            <h3 className="mt-3 font-semibold text-slate-900">{card.title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{card.description}</p>
          </Link>
        ))}
      </div>

      {/* Quick trial balance summary */}
      {team.chartSeeded && trialBalance.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Saldobalanse {currentYear}
            </h2>
            <Link
              href="/regnskap/saldobalanse"
              className="text-sm text-primary hover:underline"
            >
              Se fullstendig
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total debet</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalDebit)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total kredit</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalCredit)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Differanse</p>
              <p className={`text-xl font-bold mt-1 ${totalDebit === totalCredit ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(Math.abs(totalDebit - totalCredit))}
                {totalDebit === totalCredit && " ✓"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-500 font-medium">Konto</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Navn</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Debet</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Kredit</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.slice(0, 10).map((row) => (
                  <tr key={row.accountCode} className="border-b border-slate-50">
                    <td className="py-2 font-mono text-slate-600">{row.accountCode}</td>
                    <td className="py-2 text-slate-800">{row.accountName}</td>
                    <td className="py-2 text-right text-slate-600">
                      {row.totalDebit > 0 ? formatCurrency(row.totalDebit) : "–"}
                    </td>
                    <td className="py-2 text-right text-slate-600">
                      {row.totalCredit > 0 ? formatCurrency(row.totalCredit) : "–"}
                    </td>
                    <td className="py-2 text-right font-medium text-slate-900">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trialBalance.length > 10 && (
              <p className="text-sm text-slate-400 text-center mt-3">
                + {trialBalance.length - 10} flere kontoer
              </p>
            )}
          </div>
        </div>
      )}

      {!team.chartSeeded && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <BookOpen className="size-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">Kontoplan ikke opprettet</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Gå til kontoplan-siden for å sette opp NS 4102 standard kontoplan.
          </p>
          <Link
            href="/regnskap/kontoplan"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <BookOpen className="size-4" />
            Sett opp kontoplan
          </Link>
        </div>
      )}
    </div>
  )
}
