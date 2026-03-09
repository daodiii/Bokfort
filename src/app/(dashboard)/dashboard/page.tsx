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
import {
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import { AnomalyAlerts } from "@/components/anomaly-alerts"

export const metadata = {
  title: "Oversikt | Bokført",
}

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function statusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Utkast"
    case "SENT":
      return "Sendt"
    case "PAID":
      return "Betalt"
    case "OVERDUE":
      return "Forfalt"
    default:
      return status
  }
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "DRAFT":
      return "secondary"
    case "SENT":
      return "outline"
    case "PAID":
      return "default"
    case "OVERDUE":
      return "destructive"
    default:
      return "secondary"
  }
}

export default async function DashboardPage() {
  const { team } = await getCurrentTeam()
  const { start, end } = getMonthRange()

  const [incomeResult, expenseResult, outstandingInvoices, recentInvoices] =
    await Promise.all([
      // Total income this month
      db.income.aggregate({
        where: {
          teamId: team.id,
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),

      // Total expenses this month
      db.expense.aggregate({
        where: {
          teamId: team.id,
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),

      // Outstanding invoices (SENT or OVERDUE)
      db.invoice.aggregate({
        where: {
          teamId: team.id,
          status: { in: ["SENT", "OVERDUE"] },
        },
        _sum: { total: true },
        _count: true,
      }),

      // Recent 5 invoices
      db.invoice.findMany({
        where: { teamId: team.id },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ])

  const totalIncome = incomeResult._sum.amount ?? 0
  const totalExpenses = expenseResult._sum.amount ?? 0
  const profit = totalIncome - totalExpenses
  const outstandingCount = outstandingInvoices._count ?? 0
  const outstandingTotal = outstandingInvoices._sum.total ?? 0

  const hasInvoices = recentInvoices.length > 0
  const hasAnyData = totalIncome > 0 || totalExpenses > 0 || hasInvoices

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Oversikt</h1>
        <p className="text-muted-foreground">
          Velkommen tilbake. Her er en oppsummering for denne måneden.
        </p>
      </div>

      {/* Anomaly alerts */}
      <AnomalyAlerts />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Income card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inntekter denne måneden
            </CardTitle>
            <ArrowUpCircle className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>

        {/* Expenses card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utgifter denne måneden
            </CardTitle>
            <ArrowDownCircle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        {/* Outstanding invoices card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utestående fakturaer
            </CardTitle>
            <FileText className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(outstandingTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {outstandingCount}{" "}
              {outstandingCount === 1 ? "faktura" : "fakturaer"}
            </p>
          </CardContent>
        </Card>

        {/* Profit card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resultat denne måneden
            </CardTitle>
            {profit > 0 ? (
              <TrendingUp className="size-4 text-emerald-500" />
            ) : profit < 0 ? (
              <TrendingDown className="size-4 text-red-500" />
            ) : (
              <Minus className="size-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={
                profit > 0
                  ? "text-2xl font-bold text-emerald-600"
                  : profit < 0
                    ? "text-2xl font-bold text-red-600"
                    : "text-2xl font-bold"
              }
            >
              {formatCurrency(profit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Siste fakturaer</CardTitle>
          <CardDescription>
            {hasInvoices
              ? "De 5 siste fakturaene dine."
              : "Du har ingen fakturaer ennå."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasInvoices ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fakturanr.</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Dato</TableHead>
                  <TableHead>Forfallsdato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Beløp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      #{invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.customer.name}</TableCell>
                    <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(invoice.status)}>
                        {statusLabel(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Ingen fakturaer ennå</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Når du oppretter din første faktura, vil den dukke opp her.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state hint when no data at all */}
      {!hasAnyData && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
                <TrendingUp className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Kom i gang med Bokført</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Start med å opprette din første faktura, registrere en utgift
                eller legge inn en inntekt. Oversikten din oppdateres automatisk
                etter hvert som du registrerer data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
