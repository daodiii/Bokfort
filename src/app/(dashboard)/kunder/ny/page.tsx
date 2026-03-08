import { createCustomer } from "@/actions/customers"
import { CustomerForm } from "@/components/customer-form"

export const metadata = {
  title: "Ny kunde | Bokført",
}

export default function NyKundePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ny kunde</h1>
        <p className="text-muted-foreground">
          Opprett en ny kunde. Du kan slå opp i Brønnøysundregistrene for å fylle ut automatisk.
        </p>
      </div>

      <CustomerForm
        action={createCustomer}
        submitLabel="Opprett kunde"
        title="Kundeinformasjon"
      />
    </div>
  )
}
