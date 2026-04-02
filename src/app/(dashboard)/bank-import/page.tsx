import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Landmark,
  FileText,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  TrendingUp,
  TrendingDown,
  Upload,
} from "lucide-react"
import Link from "next/link"
import { CsvUploadForm } from "./csv-upload-form"

export const metadata = {
  title: "Bankavstemming | Bokført",
}

export default async function BankImportPage() {
  const { team } = await getCurrentTeam()

  const batches = await db.importBatch.findMany({
    where: { teamId: team.id },
    include: {
      _count: { select: { transactions: true } },
      transactions: {
        select: {
          id: true,
          matched: true,
          amount: true,
          date: true,
          description: true,
          expenseId: true,
          incomeId: true,
          expense: {
            select: { id: true, description: true, amount: true, date: true },
          },
          income: {
            select: { id: true, description: true, amount: true, date: true },
          },
        },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { importedAt: "desc" },
  })

  // Aggregate stats across all batches
  const allTransactions = batches.flatMap((b) => b.transactions)
  const matchedTransactions = allTransactions.filter((t) => t.matched)
  const unmatchedTransactions = allTransactions.filter((t) => !t.matched)

  const totalReconciled = matchedTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  )
  const totalUnreconciled = unmatchedTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  )
  const totalCount = allTransactions.length
  const matchedCount = matchedTransactions.length

  // Difference: sum of matched bank vs sum of linked records
  const matchedBankTotal = matchedTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  )
  const matchedRecordTotal = matchedTransactions.reduce((sum, t) => {
    const recordAmount = t.expense?.amount ?? t.income?.amount ?? t.amount
    return sum + recordAmount
  }, 0)
  const difference = Math.abs(matchedBankTotal - matchedRecordTotal)
  const isBalanced = difference === 0

  // Compute percentage stats
  const matchedPct =
    totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0
  const unmatchedPct =
    totalCount > 0
      ? Math.round((unmatchedTransactions.length / totalCount) * 100)
      : 0

  // Take first 10 unmatched transactions for the "Bank Statement" column
  const bankStatementItems = unmatchedTransactions.slice(0, 10)

  // For "Suggested Matches" - find unmatched expenses and incomes to suggest
  const [unmatchedExpenses, unmatchedIncomes] = await Promise.all([
    db.expense.findMany({
      where: { teamId: team.id, bankTransaction: null },
      orderBy: { date: "desc" },
      take: 20,
      select: { id: true, description: true, amount: true, date: true },
    }),
    db.income.findMany({
      where: { teamId: team.id, bankTransaction: null },
      orderBy: { date: "desc" },
      take: 20,
      select: { id: true, description: true, amount: true, date: true },
    }),
  ])

  // Simple matching: find potential matches by amount
  const suggestions = bankStatementItems.map((tx) => {
    const absTxAmount = Math.abs(tx.amount)
    const isExpense = tx.amount < 0

    const pool = isExpense ? unmatchedExpenses : unmatchedIncomes
    const match = pool.find(
      (record) => Math.abs(record.amount) === absTxAmount
    )

    if (match) {
      const txDate = new Date(tx.date).getTime()
      const matchDate = new Date(match.date).getTime()
      const daysDiff =
        Math.abs(txDate - matchDate) / (1000 * 60 * 60 * 24)
      const confidence =
        daysDiff <= 1 ? 99 : daysDiff <= 7 ? 90 : daysDiff <= 30 ? 75 : 50

      return {
        transactionId: tx.id,
        matchId: match.id,
        matchDescription: match.description,
        matchAmount: match.amount,
        matchDate: match.date,
        confidence,
      }
    }

    return {
      transactionId: tx.id,
      matchId: null,
      matchDescription: null,
      matchAmount: null,
      matchDate: null,
      confidence: 0,
    }
  })

  const hasBatches = batches.length > 0
  const latestBatch = batches[0]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Summary Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Bankavstemming
          </h1>
          <p className="text-slate-500">
            {team.companyName || team.name}
            {team.bankAccount
              ? ` (...${team.bankAccount.slice(-4)})`
              : ""}
          </p>
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold flex items-center gap-2">
            <Filter className="size-4" />
            Filter
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
            <Clock className="size-4" />
            Fullfør senere
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Totalt avstemt</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold">
              {formatCurrency(totalReconciled)}
            </p>
            {totalCount > 0 && (
              <span className="text-primary text-xs font-bold flex items-center gap-0.5">
                <TrendingUp className="size-3" />+{matchedPct}%
              </span>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Uavstemt</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold">
              {formatCurrency(totalUnreconciled)}
            </p>
            {totalCount > 0 && (
              <span className="text-red-500 text-xs font-bold flex items-center gap-0.5">
                <TrendingDown className="size-3" />-{unmatchedPct}%
              </span>
            )}
          </div>
        </div>
        <div
          className={`p-6 rounded-xl shadow-sm ${
            isBalanced
              ? "bg-white dark:bg-slate-800 border-2 border-primary/30 bg-primary/5"
              : "bg-white dark:bg-slate-800 border border-slate-100"
          }`}
        >
          <p className="text-slate-500 text-sm font-medium">Differanse</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p
              className={`text-2xl font-bold ${isBalanced ? "text-primary" : ""}`}
            >
              {formatCurrency(difference)}
            </p>
            {isBalanced && (
              <CheckCircle2 className="size-5 text-primary" />
            )}
          </div>
        </div>
      </div>

      {/* CSV Upload Section */}
      {!hasBatches ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="size-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-1">
              Ingen importerte filer
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md">
              Last opp en CSV-fil fra banken din for å importere
              transaksjoner og starte avstemming.
            </p>
            <CsvUploadForm />
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 shadow-sm">
          <details className="group">
            <summary className="cursor-pointer flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors list-none [&::-webkit-details-marker]:hidden">
              <Upload className="size-4" />
              Last opp ny CSV-fil
            </summary>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <CsvUploadForm />
            </div>
          </details>
        </div>
      )}

      {/* Reconciliation View */}
      {hasBatches && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column: Bank Statement */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Landmark className="size-5 text-primary" />
                Bankkontoutdrag
              </h3>
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                {unmatchedTransactions.length} transaksjoner
              </span>
            </div>
            <div className="space-y-3">
              {bankStatementItems.length > 0 ? (
                bankStatementItems.map((tx) => {
                  const isPositive = tx.amount > 0
                  const hasSuggestion = suggestions.find(
                    (s) =>
                      s.transactionId === tx.id && s.matchId !== null
                  )

                  return (
                    <div
                      key={tx.id}
                      className={`p-4 bg-white dark:bg-slate-800 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-shadow ${
                        hasSuggestion
                          ? "border-l-primary"
                          : "border-l-amber-400"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            {formatDate(tx.date)}
                          </p>
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {tx.description}
                          </p>
                          <p className="text-sm text-slate-500 truncate">
                            {tx.amount < 0
                              ? "Betaling"
                              : "Innbetaling"}
                          </p>
                        </div>
                        <p
                          className={`text-lg font-bold whitespace-nowrap ${
                            isPositive
                              ? "text-primary"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <CheckCircle2 className="size-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    Alle transaksjoner er avstemt!
                  </p>
                </div>
              )}

              {unmatchedTransactions.length > 10 && (
                <div className="text-center">
                  <Link
                    href={`/bank-import/${latestBatch.id}`}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Vis alle {unmatchedTransactions.length} transaksjoner
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Column: Suggested Matches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Foreslåtte treff
              </h3>
              <Link
                href={`/bank-import/${latestBatch.id}`}
                className="text-xs text-primary font-bold hover:underline"
              >
                Vis alle poster
              </Link>
            </div>
            <div className="space-y-3">
              {suggestions.map((suggestion) => {
                if (suggestion.matchId) {
                  return (
                    <div
                      key={suggestion.transactionId}
                      className="p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/30 border-dashed min-h-[105px] flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Sparkles className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">
                              {suggestion.matchDescription}
                            </p>
                            <p className="text-xs text-slate-500 italic">
                              {suggestion.confidence}% sannsynlig
                              treff
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/bank-import/${latestBatch.id}`}
                          className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary/90 shrink-0 ml-2"
                        >
                          Koble
                        </Link>
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t border-primary/10">
                        <span className="text-xs font-medium text-slate-500">
                          Beløp:{" "}
                          {formatCurrency(
                            Math.abs(suggestion.matchAmount!)
                          )}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          Dato: {formatDate(suggestion.matchDate!)}
                        </span>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={suggestion.transactionId}
                    className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed flex items-center justify-center h-[105px]"
                  >
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-2">
                        Ingen automatisk treff funnet
                      </p>
                      <Link
                        href={`/bank-import/${latestBatch.id}`}
                        className="text-primary text-xs font-bold flex items-center gap-1 mx-auto hover:underline"
                      >
                        <Plus className="size-3" />
                        Legg til manuelt
                      </Link>
                    </div>
                  </div>
                )
              })}

              {suggestions.length === 0 && (
                <div className="p-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed text-center">
                  <p className="text-sm text-slate-500">
                    Ingen transaksjoner å matche.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import History */}
      {hasBatches && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Importhistorikk</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {batches.map((batch) => {
              const batchMatched = batch.transactions.filter(
                (t) => t.matched
              ).length
              const batchTotal = batch._count.transactions
              const allMatched =
                batchMatched === batchTotal && batchTotal > 0

              return (
                <Link
                  key={batch.id}
                  href={`/bank-import/${batch.id}`}
                  className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                      {batch.filename}
                    </p>
                    {allMatched ? (
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded shrink-0">
                        {batchMatched}/{batchTotal}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Importert {formatDate(batch.importedAt)}
                  </p>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        allMatched ? "bg-primary" : "bg-primary/60"
                      }`}
                      style={{
                        width: `${batchTotal > 0 ? (batchMatched / batchTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer / Bulk Actions */}
      {hasBatches && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-slate-500">
              Velg alle for bulkavstemming:
            </span>
            <div className="flex gap-2">
              <button className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                Velg matchede
              </button>
              <button className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                Flagg gjenstående
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="text-sm font-bold text-slate-400 px-4 py-2">
              Forkast endringer
            </button>
            <button className="text-sm font-bold bg-primary text-white px-6 py-2 rounded-lg">
              Lagre og synkroniser
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
