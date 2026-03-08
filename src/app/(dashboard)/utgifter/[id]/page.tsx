import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { ExpenseForm } from "@/components/expense-form"
import { DeleteExpenseButton } from "./delete-button"

export const metadata = {
  title: "Rediger utgift | Bokført",
}

export default async function RedigerUtgiftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { team } = await getCurrentTeam()

  const [expense, categories] = await Promise.all([
    db.expense.findFirst({
      where: { id, teamId: team.id },
    }),
    db.category.findMany({
      where: {
        type: "EXPENSE",
        OR: [{ teamId: team.id }, { isDefault: true }],
      },
      orderBy: { name: "asc" },
    }),
  ])

  if (!expense) {
    notFound()
  }

  const expenseData = {
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    mvaRate: expense.mvaRate,
    categoryId: expense.categoryId,
    date: expense.date.toISOString(),
    receiptUrl: expense.receiptUrl,
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rediger utgift</h1>
          <p className="text-muted-foreground">
            Oppdater utgiftsdetaljer
          </p>
        </div>
        <DeleteExpenseButton id={expense.id} />
      </div>
      <ExpenseForm categories={categories} expense={expenseData} />
    </div>
  )
}
