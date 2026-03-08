import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate, formatOrgNumber } from "@/lib/utils"
import { InvoiceStatusBadge } from "@/components/invoice-status-badge"
import { InvoiceActions } from "@/components/invoice-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await db.invoice.findUnique({
    where: { id },
    select: { invoiceNumber: true },
  })
  return {
    title: invoice
      ? `Faktura #${invoice.invoiceNumber} | Bokført`
      : "Faktura | Bokført",
  }
}

export default async function FakturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { team } = await getCurrentTeam()

  const invoice = await db.invoice.findFirst({
    where: { id, teamId: team.id },
    include: {
      customer: true,
      lines: true,
    },
  })

  if (!invoice) {
    notFound()
  }

  // Group MVA by rate for summary
  const mvaByRate = new Map<number, number>()
  for (const line of invoice.lines) {
    const existing = mvaByRate.get(line.mvaRate) ?? 0
    mvaByRate.set(line.mvaRate, existing + line.mvaAmount)
  }

  return (
    <div className="space-y-6">
      {/* Back link and header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" render={<Link href="/faktura" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Faktura #{invoice.invoiceNumber}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <InvoiceActions invoiceId={invoice.id} status={invoice.status} />

      {/* Invoice details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Fra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{team.companyName || team.name}</p>
            {team.orgNumber && (
              <p className="text-muted-foreground">
                Org.nr: {formatOrgNumber(team.orgNumber)}
              </p>
            )}
            {team.address && <p className="text-muted-foreground">{team.address}</p>}
            {(team.postalCode || team.city) && (
              <p className="text-muted-foreground">
                {[team.postalCode, team.city].filter(Boolean).join(" ")}
              </p>
            )}
            {team.bankAccount && (
              <p className="text-muted-foreground">
                Kontonr: {team.bankAccount}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Customer info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Til</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{invoice.customer.name}</p>
            {invoice.customer.orgNumber && (
              <p className="text-muted-foreground">
                Org.nr: {formatOrgNumber(invoice.customer.orgNumber)}
              </p>
            )}
            {invoice.customer.address && (
              <p className="text-muted-foreground">{invoice.customer.address}</p>
            )}
            {(invoice.customer.postalCode || invoice.customer.city) && (
              <p className="text-muted-foreground">
                {[invoice.customer.postalCode, invoice.customer.city]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
            {invoice.customer.email && (
              <p className="text-muted-foreground">{invoice.customer.email}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dates */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">Fakturanummer</p>
              <p className="font-medium">#{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fakturadato</p>
              <p className="font-medium">{formatDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Forfallsdato</p>
              <p className="font-medium">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle>Linjer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beskrivelse</TableHead>
                <TableHead className="text-right">Antall</TableHead>
                <TableHead className="text-right">Enhetspris</TableHead>
                <TableHead className="text-right">MVA-sats</TableHead>
                <TableHead className="text-right">MVA</TableHead>
                <TableHead className="text-right">Sum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">{line.mvaRate}%</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.mvaAmount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(line.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delbeløp</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {Array.from(mvaByRate.entries()).map(([rate, amount]) => (
            <div key={rate} className="flex justify-between text-sm">
              <span className="text-muted-foreground">MVA {rate}%</span>
              <span>{formatCurrency(amount)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Totalt</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Notater
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
