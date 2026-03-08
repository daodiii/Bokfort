import { IncomeForm } from "@/components/income-form"

export const metadata = {
  title: "Ny inntekt | Bokført",
}

export default function NyInntektPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ny inntekt</h1>
        <p className="text-muted-foreground">Registrer en ny inntekt</p>
      </div>
      <IncomeForm />
    </div>
  )
}
