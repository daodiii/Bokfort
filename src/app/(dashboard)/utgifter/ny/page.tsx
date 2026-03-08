import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { ExpenseForm } from "@/components/expense-form"

export const metadata = {
  title: "Ny utgift | Bokført",
}

export default async function NyUtgiftPage() {
  const { team } = await getCurrentTeam()

  const categories = await db.category.findMany({
    where: {
      type: "EXPENSE",
      OR: [{ teamId: team.id }, { isDefault: true }],
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ny utgift</h1>
        <p className="text-muted-foreground">
          Registrer en ny utgift
        </p>
      </div>
      <ExpenseForm categories={categories} />
    </div>
  )
}
