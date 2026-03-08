import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatOrgNumber } from "@/lib/utils"
import { notFound } from "next/navigation"
import { CustomerEditView } from "./customer-edit-view"

export const metadata = {
  title: "Kunde | Bokført",
}

export default async function KundeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { team } = await getCurrentTeam()
  const { id } = await params

  const customer = await db.customer.findFirst({
    where: { id, teamId: team.id },
    include: {
      _count: {
        select: { invoices: true },
      },
    },
  })

  if (!customer) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
        <p className="text-muted-foreground">
          {customer.orgNumber
            ? `Org.nr. ${formatOrgNumber(customer.orgNumber)}`
            : "Kundedetaljer"}
        </p>
      </div>

      <CustomerEditView
        customer={{
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          orgNumber: customer.orgNumber,
          address: customer.address,
          city: customer.city,
          postalCode: customer.postalCode,
        }}
        invoiceCount={customer._count.invoices}
      />
    </div>
  )
}
