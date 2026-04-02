import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { InvoiceForm } from "@/components/invoice-form"

export const metadata = {
  title: "Ny faktura | Bokført",
}

export default async function NyFakturaPage() {
  const { team } = await getCurrentTeam()

  const customers = await db.customer.findMany({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  const nextInvoiceNumber = `INV-${team.invoiceNumberSeq.toString().padStart(4, "0")}`

  return <InvoiceForm customers={customers} nextInvoiceNumber={nextInvoiceNumber} />
}
