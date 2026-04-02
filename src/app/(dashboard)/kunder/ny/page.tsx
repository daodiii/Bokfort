import { createCustomer } from "@/actions/customers"
import { CustomerForm } from "@/components/customer-form"

export const metadata = {
  title: "Ny kunde | Bokført",
}

export default function NyKundePage() {
  return (
    <CustomerForm
      action={createCustomer}
      submitLabel="Opprett kunde"
    />
  )
}
