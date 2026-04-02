import { getCurrentTeam } from "@/lib/auth-utils"
import { getJournalEntry } from "@/actions/accounting"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export const metadata = {
  title: "Bilag | Bokført",
}

export default async function BilagDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await getCurrentTeam()
  const { id } = await params

  const entry = await getJournalEntry(id)
  if (!entry) notFound()

  const totalDebit = entry.lines.reduce((s, l) => s + l.debitAmount, 0)
  const totalCredit = entry.lines.reduce((s, l) => s + l.creditAmount, 0)
  const isBalanced = totalDebit === totalCredit

  // Determine source link
  let sourceLink: { href: string; label: string } | null = null
  if (entry.invoice) {
    sourceLink = { href: `/faktura/${entry.invoice.id}`, label: `Faktura #${entry.invoice.invoiceNumber}` }
  } else if (entry.expense) {
    sourceLink = { href: `/utgifter`, label: `Utgift: ${entry.expense.description}` }
  } else if (entry.payrollRun) {
    sourceLink = { href: `/lonn`, label: `Lønnskjøring ${entry.payrollRun.period}` }
  } else if (entry.income) {
    sourceLink = { href: `/dashboard`, label: `Inntekt: ${entry.income.description}` }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/regnskap/bilag"
          className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="size-4 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bilag #{entry.voucherNumber}
          </h1>
          <p className="text-slate-500 mt-0.5">
            Regnskapsår {entry.fiscalYear} · {formatDate(entry.date)}
          </p>
        </div>
      </div>

      {/* Entry header info */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Beskrivelse</p>
            <p className="text-slate-800 mt-1 font-medium">{entry.description}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block size-2 rounded-full ${isBalanced ? "bg-emerald-400" : "bg-red-400"}`} />
              <span className="text-sm text-slate-700">
                {isBalanced ? "Balansert" : "Ubalansert"}
              </span>
            </div>
          </div>
          {sourceLink && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kilde</p>
              <Link href={sourceLink.href} className="text-primary hover:underline text-sm mt-1 inline-flex items-center gap-1">
                <FileText className="size-3.5" />
                {sourceLink.label}
              </Link>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Opprettet</p>
            <p className="text-sm text-slate-700 mt-1">{formatDate(entry.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Journal lines */}
      <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Posteringer</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-2.5 text-slate-500 font-medium w-24">Konto</th>
              <th className="text-left px-5 py-2.5 text-slate-500 font-medium">Kontonavn</th>
              <th className="text-left px-5 py-2.5 text-slate-500 font-medium">Beskrivelse</th>
              <th className="text-right px-5 py-2.5 text-slate-500 font-medium w-32">Debet</th>
              <th className="text-right px-5 py-2.5 text-slate-500 font-medium w-32">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((line) => (
              <tr key={line.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-2.5 font-mono text-slate-600 font-medium">
                  {line.account.code}
                </td>
                <td className="px-5 py-2.5 text-slate-700">
                  {line.account.name}
                </td>
                <td className="px-5 py-2.5 text-slate-500">
                  {line.description || "–"}
                </td>
                <td className="px-5 py-2.5 text-right font-mono">
                  {line.debitAmount > 0 ? (
                    <span className="text-slate-800">{formatCurrency(line.debitAmount)}</span>
                  ) : (
                    <span className="text-slate-300">–</span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-right font-mono">
                  {line.creditAmount > 0 ? (
                    <span className="text-slate-800">{formatCurrency(line.creditAmount)}</span>
                  ) : (
                    <span className="text-slate-300">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td colSpan={3} className="px-5 py-3 text-slate-700">Sum</td>
              <td className="px-5 py-3 text-right font-mono text-slate-900">
                {formatCurrency(totalDebit)}
              </td>
              <td className="px-5 py-3 text-right font-mono text-slate-900">
                {formatCurrency(totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
