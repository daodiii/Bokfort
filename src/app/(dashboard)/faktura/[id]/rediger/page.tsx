import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { InvoiceForm } from "@/components/invoice-form"
import { notFound, redirect } from "next/navigation"

export const metadata = {
  title: "Rediger faktura | Bokført",
}

export default async function RedigerFakturaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { team } = await getCurrentTeam()

  const invoice = await db.invoice.findFirst({
    where: { id, teamId: team.id },
    include: { lines: true },
  })

  if (!invoice) {
    notFound()
  }

  if (invoice.status !== "DRAFT") {
    redirect(`/faktura/${id}`)
  }

  const customers = await db.customer.findMany({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Rediger faktura #{invoice.invoiceNumber}
        </h1>
        <p className="text-muted-foreground">
          Oppdater fakturadetaljene nedenfor.
        </p>
      </div>

      <InvoiceForm
        customers={customers}
        invoice={{
          id: invoice.id,
          customerId: invoice.customerId,
          issueDate: invoice.issueDate.toISOString().split("T")[0],
          dueDate: invoice.dueDate.toISOString().split("T")[0],
          notes: invoice.notes,
          lines: invoice.lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            mvaRate: line.mvaRate,
          })),
        }}
      />
    </div>
  )
}
