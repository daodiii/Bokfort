import { getMvaReport } from "@/actions/reports"
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
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { MvaPeriodSelector } from "../mva-period-selector"
import { CsvExportButton } from "../csv-export-button"

export const metadata = {
  title: "MVA-oppgave | Bokført",
}

/** Get the current termin (1-6) based on the current month */
function getCurrentTermin(): number {
  const month = new Date().getMonth() // 0-indexed
  return Math.floor(month / 2) + 1
}

/** Convert termin + year to a date range */
function terminToDateRange(termin: number, year: number) {
  const startMonth = (termin - 1) * 2 // 0-indexed month
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 2, 0, 23, 59, 59, 999) // last day of second month
  return { start, end }
}

function terminLabel(termin: number): string {
  const labels: Record<number, string> = {
    1: "jan-feb",
    2: "mar-apr",
    3: "mai-jun",
    4: "jul-aug",
    5: "sep-okt",
    6: "nov-des",
  }
  return labels[termin] ?? ""
}

export default async function MvaOppgavePage({
  searchParams,
}: {
  searchParams: Promise<{ termin?: string; aar?: string }>
}) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const termin = params.termin ? parseInt(params.termin, 10) : getCurrentTermin()
  const year = params.aar ? parseInt(params.aar, 10) : currentYear

  const { start, end } = terminToDateRange(termin, year)
  const report = await getMvaReport(start, end)

  // Prepare CSV data
  const csvData: Record<string, string | number>[] = []

  for (const item of report.outgoing) {
    csvData.push({
      type: "Utgående MVA",
      rate: item.rate,
      base: item.base / 100,
      mva: item.mva / 100,
    })
  }
  for (const item of report.incoming) {
    csvData.push({
      type: "Inngående MVA",
      rate: item.rate,
      base: item.base / 100,
      mva: item.mva / 100,
    })
  }
  csvData.push({
    type: "Netto MVA",
    rate: "",
    base: "",
    mva: report.netMva / 100,
  })

  const hasData = report.outgoing.length > 0 || report.incoming.length > 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rapporter">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MVA-oppgave</h1>
            <p className="text-muted-foreground">
              Termin {termin} ({terminLabel(termin)}) {year}
            </p>
          </div>
        </div>
        <CsvExportButton
          data={csvData}
          headers={["Type", "Sats (%)", "Grunnlag (kr)", "MVA (kr)"]}
          filename={`mva-oppgave-termin${termin}-${year}.csv`}
        />
      </div>

      {/* Period selector */}
      <MvaPeriodSelector
        defaultTermin={String(termin)}
        defaultYear={String(year)}
      />

      {!hasData ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-medium">Ingen data</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Det finnes ingen fakturaer eller utgifter i den valgte terminen.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Utgående MVA */}
          <Card>
            <CardHeader>
              <CardTitle>Utgående MVA (salg/fakturaer)</CardTitle>
            </CardHeader>
            <CardContent>
              {report.outgoing.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>MVA-sats</TableHead>
                      <TableHead className="text-right">Grunnlag</TableHead>
                      <TableHead className="text-right">MVA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.outgoing.map((item) => (
                      <TableRow key={item.rate}>
                        <TableCell>{item.rate}%</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.base)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.mva)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">
                        Sum utgående MVA
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right font-medium">
                        {formatCurrency(report.totalOutgoing)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ingen utgående MVA i perioden.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Inngående MVA */}
          <Card>
            <CardHeader>
              <CardTitle>Inngående MVA (kjøp/utgifter)</CardTitle>
            </CardHeader>
            <CardContent>
              {report.incoming.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>MVA-sats</TableHead>
                      <TableHead className="text-right">Grunnlag</TableHead>
                      <TableHead className="text-right">MVA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.incoming.map((item) => (
                      <TableRow key={item.rate}>
                        <TableCell>{item.rate}%</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.base)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.mva)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">
                        Sum inngående MVA
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right font-medium">
                        {formatCurrency(report.totalIncoming)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ingen inngående MVA i perioden.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Netto MVA */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Netto MVA</span>
                <span
                  className={
                    report.netMva > 0
                      ? "text-2xl font-bold text-red-600"
                      : report.netMva < 0
                        ? "text-2xl font-bold text-emerald-600"
                        : "text-2xl font-bold"
                  }
                >
                  {formatCurrency(report.netMva)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {report.netMva > 0
                  ? "MVA til innbetaling"
                  : report.netMva < 0
                    ? "MVA til gode"
                    : "Ingen MVA-differanse"}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
