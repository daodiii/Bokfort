import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Receipt } from "lucide-react"
import Link from "next/link"
import { CategoryFilter } from "./category-filter"

export const metadata = {
  title: "Utgifter | Bokført",
}

export default async function UtgifterPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>
}) {
  const { team } = await getCurrentTeam()
  const params = await searchParams
  const categoryFilter = params.kategori ?? ""

  const [expenses, categories] = await Promise.all([
    db.expense.findMany({
      where: {
        teamId: team.id,
        ...(categoryFilter ? { categoryId: categoryFilter } : {}),
      },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    db.category.findMany({
      where: {
        type: "EXPENSE",
        OR: [{ teamId: team.id }, { isDefault: true }],
      },
      orderBy: { name: "asc" },
    }),
  ])

  const hasExpenses = expenses.length > 0
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const totalMva = expenses.reduce((sum, exp) => sum + exp.mvaAmount, 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utgifter</h1>
          <p className="text-muted-foreground">
            Registrer og administrer utgiftene dine
          </p>
        </div>
        <Link href="/utgifter/ny" className={buttonVariants({ variant: "default" })}>
            <Plus className="size-4" />
            Ny utgift
        </Link>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          defaultValue={categoryFilter}
        />
      )}

      {/* Expenses table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {categoryFilter
              ? `Filtrerte utgifter (${expenses.length})`
              : `Alle utgifter (${expenses.length})`}
          </CardTitle>
          {!hasExpenses && !categoryFilter && (
            <CardDescription>
              Du har ingen utgifter ennå. Registrer din første utgift for å komme i gang.
            </CardDescription>
          )}
          {!hasExpenses && categoryFilter && (
            <CardDescription>
              Ingen utgifter i denne kategorien.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hasExpenses ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead>
                  <TableHead>Beskrivelse</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">MVA</TableHead>
                  <TableHead className="text-right">Beløp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/utgifter/${expense.id}`}
                        className="font-medium hover:underline"
                      >
                        {expense.description}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {expense.category ? (
                        <Badge variant="secondary">
                          {expense.category.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {expense.mvaRate}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-medium">
                    Totalt
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(totalMva)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(totalAmount)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">
                {categoryFilter ? "Ingen treff" : "Ingen utgifter ennå"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {categoryFilter
                  ? "Prøv å endre kategorifilteringen."
                  : "Registrer din første utgift for å holde oversikt over kostnadene dine."}
              </p>
              {!categoryFilter && (
                <Link href="/utgifter/ny" className={buttonVariants({ variant: "default" }) + " mt-4"}>
                    <Plus className="size-4" />
                    Ny utgift
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
