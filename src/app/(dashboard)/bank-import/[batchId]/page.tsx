import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { TransactionMatcher } from "@/components/transaction-matcher"

export const metadata = {
  title: "Transaksjoner | Bokført",
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
          expense: { select: { id: true, description: true } },
          income: { select: { id: true, description: true } },
        },
      },
    },
  })

  if (!batch) {
    notFound()
  }

  const matchedCount = batch.transactions.filter((t) => t.matched).length
  const totalCount = batch.transactions.length

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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Link href="/bank-import" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="size-4" />
            Tilbake
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {batch.filename}
          </h1>
          <p className="text-muted-foreground">
            Importert {formatDate(batch.importedAt)} &middot; {matchedCount} /{" "}
            {totalCount} koblet
          </p>
        </div>
      </div>

      {/* Transactions table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaksjoner ({totalCount})</CardTitle>
          <CardDescription>
            Koble transaksjoner til eksisterende utgifter/inntekter eller opprett
            nye
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dato</TableHead>
                <TableHead>Beskrivelse</TableHead>
                <TableHead className="text-right">Beløp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Handling</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.transactions.map((tx) => {
                const isPositive = tx.amount > 0
                const linkedDescription = tx.matched
                  ? tx.expense?.description || tx.income?.description || ""
                  : ""

                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {tx.description}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium whitespace-nowrap ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      {tx.matched ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="secondary">Koblet</Badge>
                          {linkedDescription && (
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {linkedDescription}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline">Ikke koblet</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!tx.matched && (
                        <TransactionMatcher
                          transactionId={tx.id}
                          transactionAmount={tx.amount}
                          expenses={expenses}
                          incomes={incomes}
                          categories={categories}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
