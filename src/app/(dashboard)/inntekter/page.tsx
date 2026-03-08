import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { Plus, Wallet } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Inntekter | Bokført",
}

export default async function InntekterPage() {
  const { team } = await getCurrentTeam()

  const incomes = await db.income.findMany({
    where: { teamId: team.id },
    include: { invoice: true },
    orderBy: { date: "desc" },
  })

  const hasIncomes = incomes.length > 0
  const totalAmount = incomes.reduce((sum, inc) => sum + inc.amount, 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inntekter</h1>
          <p className="text-muted-foreground">
            Registrer og administrer inntektene dine
          </p>
        </div>
        <Button asChild>
          <Link href="/inntekter/ny">
            <Plus className="size-4" />
            Ny inntekt
          </Link>
        </Button>
      </div>

      {/* Incomes table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle inntekter ({incomes.length})</CardTitle>
          {!hasIncomes && (
            <CardDescription>
              Du har ingen inntekter ennå. Registrer din første inntekt for å
              komme i gang.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hasIncomes ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead>
                  <TableHead>Beskrivelse</TableHead>
                  <TableHead>Kilde</TableHead>
                  <TableHead className="text-right">Beløp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(income.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/inntekter/${income.id}`}
                          className="font-medium hover:underline"
                        >
                          {income.description}
                        </Link>
                        {income.invoiceId && income.invoice && (
                          <Badge variant="secondary">
                            Faktura #{income.invoice.invoiceNumber}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {income.source ? (
                        <span>{income.source}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(income.amount)}
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
                    {formatCurrency(totalAmount)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Ingen inntekter ennå</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Registrer din første inntekt for å holde oversikt over
                inntektene dine.
              </p>
              <Button asChild className="mt-4">
                <Link href="/inntekter/ny">
                  <Plus className="size-4" />
                  Ny inntekt
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
