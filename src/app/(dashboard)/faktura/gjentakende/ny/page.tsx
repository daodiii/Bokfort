import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { RecurringInvoiceForm } from "./recurring-invoice-form"

export const metadata = {
  title: "Ny gjentakende faktura | Bokført",
}

export default async function NyGjentakendeFakturaPage() {
  const { team } = await getCurrentTeam()

  const customers = await db.customer.findMany({
    where: { teamId: team.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return <RecurringInvoiceForm customers={customers} />
}
