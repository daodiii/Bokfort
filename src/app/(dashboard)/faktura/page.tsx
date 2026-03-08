import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/utils"
import { InvoiceStatusBadge } from "@/components/invoice-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, FileText } from "lucide-react"
import Link from "next/link"
import type { InvoiceStatus } from "@/generated/prisma"

export const metadata = {
  title: "Fakturaer | Bokført",
}

const STATUS_TABS: { value: string; label: string; statuses: InvoiceStatus[] | null }[] = [
  { value: "alle", label: "Alle", statuses: null },
  { value: "utkast", label: "Utkast", statuses: ["DRAFT"] },
  { value: "sendt", label: "Sendt", statuses: ["SENT"] },
  { value: "betalt", label: "Betalt", statuses: ["PAID"] },
  { value: "forfalt", label: "Forfalt", statuses: ["OVERDUE"] },
]

export default async function FakturaPage() {
  const { team } = await getCurrentTeam()

  const invoices = await db.invoice.findMany({
    where: { teamId: team.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  })

  const hasInvoices = invoices.length > 0

  function filterInvoices(statuses: InvoiceStatus[] | null) {
    if (!statuses) return invoices
    return invoices.filter((inv) => statuses.includes(inv.status))
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fakturaer</h1>
          <p className="text-muted-foreground">
            Opprett og administrer fakturaene dine.
          </p>
        </div>
        <Button render={<Link href="/faktura/ny" />}>
          <Plus className="size-4" />
          Ny faktura
        </Button>
      </div>

      {hasInvoices ? (
        <Tabs defaultValue="alle">
          <TabsList>
            {STATUS_TABS.map((tab) => {
              const count = filterInvoices(tab.statuses).length
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({count})
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {STATUS_TABS.map((tab) => {
            const filtered = filterInvoices(tab.statuses)
            return (
              <TabsContent key={tab.value} value={tab.value}>
                <Card>
                  <CardContent className="p-0">
                    {filtered.length > 0 ? (
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
                          {filtered.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell>
                                <Link
                                  href={`/faktura/${invoice.id}`}
                                  className="font-medium hover:underline"
                                >
                                  #{invoice.invoiceNumber}
                                </Link>
                              </TableCell>
                              <TableCell>{invoice.customer.name}</TableCell>
                              <TableCell>
                                {formatDate(invoice.issueDate)}
                              </TableCell>
                              <TableCell>
                                {formatDate(invoice.dueDate)}
                              </TableCell>
                              <TableCell>
                                <InvoiceStatusBadge status={invoice.status} />
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
                        <FileText className="size-10 text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Ingen fakturaer med denne statusen.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Ingen fakturaer ennå</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Opprett din første faktura for å komme i gang.
              </p>
              <Button className="mt-4" render={<Link href="/faktura/ny" />}>
                <Plus className="size-4" />
                Ny faktura
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
