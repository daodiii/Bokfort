import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { IncomeForm } from "@/components/income-form"
import { DeleteIncomeButton } from "./delete-button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Rediger inntekt | Bokført",
}

export default async function RedigerInntektPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { team } = await getCurrentTeam()

  const income = await db.income.findFirst({
    where: { id, teamId: team.id },
    include: { invoice: true },
  })

  if (!income) {
    notFound()
  }

  const isInvoiceLinked = !!income.invoiceId

  // If linked to invoice, show read-only view
  if (isInvoiceLinked) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Inntektsdetaljer
          </h1>
          <p className="text-muted-foreground">
            Vis inntektsinformasjon
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {income.description}
              {income.invoice && (
                <Badge variant="secondary">
                  Faktura #{income.invoice.invoiceNumber}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <span>
                Denne inntekten er knyttet til en faktura og kan ikke endres.
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Beskrivelse</p>
                <p className="font-medium">{income.description}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Beløp</p>
                <p className="font-medium">{formatCurrency(income.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kilde</p>
                <p className="font-medium">{income.source || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dato</p>
                <p className="font-medium">{formatDate(income.date)}</p>
              </div>
              {income.invoice && (
                <div>
                  <p className="text-sm text-muted-foreground">Fra faktura</p>
                  <Link
                    href={`/faktura/${income.invoiceId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Faktura #{income.invoice.invoiceNumber}
                  </Link>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Link
                href="/inntekter"
                className="text-sm text-muted-foreground hover:underline"
              >
                Tilbake til inntekter
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Editable income (not invoice-linked)
  const incomeData = {
    id: income.id,
    description: income.description,
    amount: income.amount,
    source: income.source,
    date: income.date.toISOString(),
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Rediger inntekt
          </h1>
          <p className="text-muted-foreground">Oppdater inntektsdetaljer</p>
        </div>
        <DeleteIncomeButton id={income.id} />
      </div>
      <IncomeForm income={incomeData} />
    </div>
  )
}
