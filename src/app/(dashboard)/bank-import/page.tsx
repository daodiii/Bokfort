import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatDate } from "@/lib/utils"
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
import { Upload } from "lucide-react"
import Link from "next/link"
import { CsvUploadForm } from "./csv-upload-form"

export const metadata = {
  title: "Bank-import | Bokført",
}

export default async function BankImportPage() {
  const { team } = await getCurrentTeam()

  const batches = await db.importBatch.findMany({
    where: { teamId: team.id },
    include: {
      _count: { select: { transactions: true } },
      transactions: {
        select: { matched: true },
      },
    },
    orderBy: { importedAt: "desc" },
  })

  const hasBatches = batches.length > 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bank-import</h1>
        <p className="text-muted-foreground">
          Importer transaksjoner fra banken din via CSV-fil
        </p>
      </div>

      {/* CSV upload */}
      <Card>
        <CardHeader>
          <CardTitle>Last opp CSV</CardTitle>
          <CardDescription>
            Last opp en CSV-fil fra banken din for å importere transaksjoner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CsvUploadForm />
        </CardContent>
      </Card>

      {/* Import history */}
      <Card>
        <CardHeader>
          <CardTitle>Importhistorikk</CardTitle>
          {!hasBatches && (
            <CardDescription>
              Du har ikke importert noen filer ennå. Last opp en CSV-fil for å
              komme i gang.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hasBatches ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filnavn</TableHead>
                  <TableHead>Dato</TableHead>
                  <TableHead className="text-right">Transaksjoner</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const matchedCount = batch.transactions.filter(
                    (t) => t.matched
                  ).length
                  const totalCount = batch._count.transactions
                  const allMatched = matchedCount === totalCount

                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <Link
                          href={`/bank-import/${batch.id}`}
                          className="font-medium hover:underline"
                        >
                          {batch.filename}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(batch.importedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {totalCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {allMatched ? (
                          <Badge variant="secondary">
                            Alle koblet
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {matchedCount} / {totalCount} koblet
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Ingen importerte filer</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Last opp en CSV-fil fra banken din for å importere og koble
                transaksjoner.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
