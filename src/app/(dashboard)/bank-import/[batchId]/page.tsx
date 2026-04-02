import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BankReconciliationView } from "./bank-reconciliation-view"

export const metadata = {
  title: "Avstemming | Bokført",
}

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const { team } = await getCurrentTeam()

  const batch = await db.importBatch.findFirst({
    where: { id: batchId, teamId: team.id },
    include: {
      transactions: {
        orderBy: { date: "desc" },
        include: {
          expense: { select: { id: true, description: true, amount: true, date: true } },
          income: { select: { id: true, description: true, amount: true, date: true } },
        },
      },
    },
  })

  if (!batch) {
    notFound()
  }

  const matchedCount = batch.transactions.filter((t) => t.matched).length
  const totalCount = batch.transactions.length

  // Compute reconciliation stats
  const matchedTransactions = batch.transactions.filter((t) => t.matched)
  const unmatchedTransactions = batch.transactions.filter((t) => !t.matched)

  const totalReconciledAmount = matchedTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  )
  const totalUnreconciledAmount = unmatchedTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  )

  // Fetch unmatched expenses and incomes for the matcher component
  const [expenses, incomes, categories] = await Promise.all([
    db.expense.findMany({
      where: {
        teamId: team.id,
        bankTransaction: null,
      },
      orderBy: { date: "desc" },
      take: 50,
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
      },
    }),
    db.income.findMany({
      where: {
        teamId: team.id,
        bankTransaction: null,
      },
      orderBy: { date: "desc" },
      take: 50,
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
      },
    }),
    db.category.findMany({
      where: {
        OR: [{ teamId: team.id }, { isDefault: true }],
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
      },
    }),
  ])

  // Serialize transactions for the client component
  const serializedTransactions = batch.transactions.map((tx) => ({
    id: tx.id,
    date: tx.date.toISOString(),
    description: tx.description,
    amount: tx.amount,
    matched: tx.matched,
    expense: tx.expense
      ? {
          id: tx.expense.id,
          description: tx.expense.description,
          amount: tx.expense.amount,
          date: tx.expense.date.toISOString(),
        }
      : null,
    income: tx.income
      ? {
          id: tx.income.id,
          description: tx.income.description,
          amount: tx.income.amount,
          date: tx.income.date.toISOString(),
        }
      : null,
  }))

  const serializedExpenses = expenses.map((e) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    date: e.date.toISOString(),
  }))

  const serializedIncomes = incomes.map((i) => ({
    id: i.id,
    description: i.description,
    amount: i.amount,
    date: i.date.toISOString(),
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/bank-import"
              className="flex size-8 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                Avstemming
              </h1>
              <p className="text-muted-foreground">
                {batch.filename} &middot; Importert {formatDate(batch.importedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-primary/10 bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Totalt avstemt
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-bold">
              {formatCurrency(totalReconciledAmount)}
            </p>
            {totalCount > 0 && (
              <span className="text-xs font-bold text-primary">
                {Math.round((matchedCount / totalCount) * 100)}%
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-primary/10 bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Ikke avstemt
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-bold">
              {formatCurrency(totalUnreconciledAmount)}
            </p>
            {unmatchedTransactions.length > 0 && (
              <span className="text-xs font-bold text-destructive">
                {unmatchedTransactions.length} gjenstår
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Differanse
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalUnreconciledAmount)}
            </p>
            {totalUnreconciledAmount === 0 && (
              <CheckCircle2 className="size-5 text-primary" />
            )}
          </div>
        </div>
      </div>

      {/* Main reconciliation view (client component) */}
      <BankReconciliationView
        batchId={batchId}
        transactions={serializedTransactions}
        expenses={serializedExpenses}
        incomes={serializedIncomes}
        categories={categories}
        matchedCount={matchedCount}
        totalCount={totalCount}
      />
    </div>
  )
}
