import { getCurrentTeam } from "@/lib/auth-utils"
import { getJournalEntries } from "@/actions/accounting"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ListOrdered, FileText, ArrowRight } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Bilag | Bokført",
}

export default async function BilagPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; page?: string }>
}) {
  await getCurrentTeam()
  const params = await searchParams

  const currentYear = new Date().getFullYear()
  const fiscalYear = params.year ? parseInt(params.year) : currentYear
  const page = params.page ? parseInt(params.page) : 1

  const { entries, total, pageSize } = await getJournalEntries({
    fiscalYear,
    page,
    pageSize: 50,
  })

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bilag</h1>
          <p className="text-slate-500 mt-1">
            Alle posteringer med bilagsnummer for regnskapsåret {fiscalYear}
          </p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2">
          {[currentYear - 1, currentYear].map((yr) => (
            <Link
              key={yr}
              href={`/regnskap/bilag?year=${yr}`}
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

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <ListOrdered className="size-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">Ingen bilag ennå</h3>
          <p className="text-sm text-slate-500 mt-1">
            Bilag opprettes automatisk når du registrerer fakturaer, utgifter, lønn og andre transaksjoner.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-slate-500 font-medium w-20">Nr.</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium w-28">Dato</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Beskrivelse</th>
                <th className="text-right px-5 py-3 text-slate-500 font-medium w-32">Debet</th>
                <th className="text-right px-5 py-3 text-slate-500 font-medium w-32">Kredit</th>
                <th className="text-center px-5 py-3 text-slate-500 font-medium w-16">Linjer</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const totalDebit = entry.lines.reduce((s, l) => s + l.debitAmount, 0)
                const totalCredit = entry.lines.reduce((s, l) => s + l.creditAmount, 0)

                return (
                  <tr key={entry.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-mono text-slate-600 font-medium">
                      {entry.voucherNumber}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-5 py-3 text-slate-800">
                      <div className="flex items-center gap-2">
                        <FileText className="size-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{entry.description}</span>
                      </div>
                      {/* Source badge */}
                      {entry.invoiceId && (
                        <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 ml-5 mt-0.5 inline-block">Faktura</span>
                      )}
                      {entry.expenseId && (
                        <span className="text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 ml-5 mt-0.5 inline-block">Utgift</span>
                      )}
                      {entry.payrollRunId && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 ml-5 mt-0.5 inline-block">Lønn</span>
                      )}
                      {entry.incomeId && (
                        <span className="text-xs text-cyan-600 bg-cyan-50 rounded-full px-2 py-0.5 ml-5 mt-0.5 inline-block">Inntekt</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700">
                      {formatCurrency(totalDebit)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700">
                      {formatCurrency(totalCredit)}
                    </td>
                    <td className="px-5 py-3 text-center text-slate-500">
                      {entry.lines.length}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/regnskap/bilag/${entry.id}`}>
                        <ArrowRight className="size-4 text-slate-400 hover:text-primary transition-colors" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-sm text-slate-500">
                Viser {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} av {total} bilag
              </p>
              <div className="flex gap-1">
                {page > 1 && (
                  <Link
                    href={`/regnskap/bilag?year=${fiscalYear}&page=${page - 1}`}
                    className="rounded-lg px-3 py-1.5 text-sm bg-white border border-slate-200 hover:bg-slate-50"
                  >
                    Forrige
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/regnskap/bilag?year=${fiscalYear}&page=${page + 1}`}
                    className="rounded-lg px-3 py-1.5 text-sm bg-white border border-slate-200 hover:bg-slate-50"
                  >
                    Neste
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-slate-400 text-center">
        {total} bilag i {fiscalYear}
      </p>
    </div>
  )
}
