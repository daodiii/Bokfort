import { getProfitAndLoss } from "@/actions/reports"
import { formatCurrency } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button-variants"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { DateRangeSelector } from "../date-range-selector"
import { CsvExportButton } from "../csv-export-button"

export const metadata = {
  title: "Resultatregnskap | Bokført",
}

function getDefaultDates() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const endOfYear = new Date(now.getFullYear(), 11, 31)
  return {
    from: startOfYear.toISOString().split("T")[0],
    to: endOfYear.toISOString().split("T")[0],
  }
}

export default async function ResultatregnskapPage({
  searchParams,
}: {
  searchParams: Promise<{ fra?: string; til?: string }>
}) {
  const params = await searchParams
  const defaults = getDefaultDates()
  const fra = params.fra || defaults.from
  const til = params.til || defaults.to

  const startDate = new Date(fra + "T00:00:00")
  const endDate = new Date(til + "T23:59:59.999")

  const report = await getProfitAndLoss(startDate, endDate)

  // Prepare CSV data
  const csvData: Record<string, string | number>[] = []

  for (const income of report.incomes) {
    csvData.push({
      type: "Inntekt",
      category: income.category,
      amount: income.total / 100,
    })
  }
  for (const expense of report.expenses) {
    csvData.push({
      type: "Utgift",
      category: expense.category,
      amount: expense.total / 100,
    })
  }
  csvData.push({
    type: "Resultat",
    category: "",
    amount: report.profit / 100,
  })

  const hasData = report.incomes.length > 0 || report.expenses.length > 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/rapporter" className={buttonVariants({ variant: "ghost", size: "icon" })}>
              <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Resultatregnskap
            </h1>
            <p className="text-muted-foreground">
              Oversikt over inntekter, utgifter og resultat
            </p>
          </div>
        </div>
        <CsvExportButton
          data={csvData}
          headers={["Type", "Kategori", "Beløp (kr)"]}
          filename={`resultatregnskap-${fra}-${til}.csv`}
        />
      </div>

      {/* Date range selector */}
      <DateRangeSelector
        defaultFrom={fra}
        defaultTo={til}
        basePath="/rapporter/resultat"
      />

      {!hasData ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-medium">Ingen data</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Det finnes ingen inntekter eller utgifter i den valgte perioden.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Inntekter */}
          <Card>
            <CardHeader>
              <CardTitle>Inntekter</CardTitle>
            </CardHeader>
            <CardContent>
              {report.incomes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori / Kilde</TableHead>
                      <TableHead className="text-right">Beløp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.incomes.map((income) => (
                      <TableRow key={income.category}>
                        <TableCell>{income.category}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(income.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">
                        Sum inntekter
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(report.totalIncome)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ingen inntekter i perioden.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Utgifter */}
          <Card>
            <CardHeader>
              <CardTitle>Utgifter</CardTitle>
            </CardHeader>
            <CardContent>
              {report.expenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Beløp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.expenses.map((expense) => (
                      <TableRow key={expense.category}>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(expense.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">
                        Sum utgifter
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(report.totalExpenses)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ingen utgifter i perioden.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Resultat */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Resultat</span>
                <span
                  className={
                    report.profit > 0
                      ? "text-2xl font-bold text-emerald-600"
                      : report.profit < 0
                        ? "text-2xl font-bold text-red-600"
                        : "text-2xl font-bold"
                  }
                >
                  {formatCurrency(report.profit)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {report.profit > 0
                  ? "Overskudd i perioden"
                  : report.profit < 0
                    ? "Underskudd i perioden"
                    : "Balansert resultat"}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
