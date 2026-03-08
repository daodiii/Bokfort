"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  createIncome,
  updateIncome,
  type IncomeState,
} from "@/actions/incomes"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

type IncomeData = {
  id: string
  description: string
  amount: number // in øre
  source: string | null
  date: string // ISO string
}

type IncomeFormProps = {
  income?: IncomeData
}

const initialState: IncomeState = {}

export function IncomeForm({ income }: IncomeFormProps) {
  const router = useRouter()
  const isEditing = !!income

  const action = isEditing
    ? updateIncome.bind(null, income.id)
    : createIncome

  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.success) {
      router.push("/inntekter")
      router.refresh()
    }
  }, [state.success, router])

  // Format the date for the input field (YYYY-MM-DD)
  const defaultDate = income
    ? new Date(income.date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Rediger inntekt" : "Ny inntekt"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.errors?._form && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.errors._form[0]}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Input
              id="description"
              name="description"
              type="text"
              placeholder="Hva er inntekten for?"
              required
              defaultValue={income?.description ?? ""}
            />
            {state.errors?.description && (
              <p className="text-xs text-destructive">
                {state.errors.description[0]}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Beløp (kr)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                required
                defaultValue={
                  income ? (income.amount / 100).toString() : ""
                }
              />
              {state.errors?.amount && (
                <p className="text-xs text-destructive">
                  {state.errors.amount[0]}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="source">Kilde (valgfritt)</Label>
              <Input
                id="source"
                name="source"
                type="text"
                placeholder="F.eks. kundenavn, tjeneste..."
                defaultValue={income?.source ?? ""}
              />
              {state.errors?.source && (
                <p className="text-xs text-destructive">
                  {state.errors.source[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Dato</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={defaultDate}
            />
            {state.errors?.date && (
              <p className="text-xs text-destructive">
                {state.errors.date[0]}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Lagrer..."
                  : "Oppretter..."
                : "Lagre"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/inntekter">Avbryt</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
