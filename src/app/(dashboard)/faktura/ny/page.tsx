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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ny faktura</h1>
        <p className="text-muted-foreground">
          Opprett en ny faktura til en kunde.
        </p>
      </div>

      <InvoiceForm customers={customers} />
    </div>
  )
}
