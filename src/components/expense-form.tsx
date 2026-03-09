"use client"

import { useActionState, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  createExpense,
  updateExpense,
  type ExpenseState,
} from "@/actions/expenses"
import { MVA_RATES, type MvaRate, extractNet, calculateMva } from "@/lib/mva"
import { kronerToOre, formatCurrency } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReceiptDropZone } from "@/components/receipt-dropzone"
import { CategorySuggestion } from "@/components/category-suggestion"
import type { ScanReceiptResult } from "@/actions/ai"

type Category = {
  id: string
  name: string
}

type ExpenseData = {
  id: string
  description: string
  amount: number // in øre
  mvaRate: number
  categoryId: string | null
  date: string // ISO string
  receiptUrl: string | null
}

type ExpenseFormProps = {
  categories: Category[]
  expense?: ExpenseData
}

type OcrData = NonNullable<ScanReceiptResult["data"]>

const initialState: ExpenseState = {}

export function ExpenseForm({ categories, expense }: ExpenseFormProps) {
  const router = useRouter()
  const isEditing = !!expense

  const action = isEditing
    ? updateExpense.bind(null, expense.id)
    : createExpense

  const [state, formAction, isPending] = useActionState(action, initialState)

  // Format the date for the input field (YYYY-MM-DD)
  const defaultDate = expense
    ? new Date(expense.date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0]

  const [amount, setAmount] = useState(
    expense ? (expense.amount / 100).toString() : ""
  )
  const [mvaRate, setMvaRate] = useState(
    expense ? expense.mvaRate.toString() : "25"
  )
  const [description, setDescription] = useState(expense?.description ?? "")
  const [date, setDate] = useState(defaultDate)
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? "")

  const handleScanComplete = useCallback((data: OcrData) => {
    setDescription(data.description)
    setAmount(data.amount.toString())
    setMvaRate(data.mvaRate.toString())
    setDate(data.date)
    const matchedCat = categories.find(
      (c) => c.name.toLowerCase() === data.suggestedCategory.toLowerCase()
    )
    if (matchedCat) {
      setCategoryId(matchedCat.id)
    }
  }, [categories])

  useEffect(() => {
    if (state.success) {
      router.push("/utgifter")
      router.refresh()
    }
  }, [state.success, router])

  // Calculate MVA display
  const amountNum = parseFloat(amount) || 0
  const mvaRateNum = parseInt(mvaRate) as MvaRate
  const grossOre = kronerToOre(amountNum)
  const netOre = extractNet(grossOre, mvaRateNum)
  const mvaAmountOre = calculateMva(netOre, mvaRateNum)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Rediger utgift" : "Ny utgift"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.errors?._form && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.errors._form[0]}
            </div>
          )}

          <ReceiptDropZone onScanComplete={handleScanComplete} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Input
              id="description"
              name="description"
              type="text"
              placeholder="Hva er utgiften for?"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {state.errors?.description && (
              <p className="text-xs text-destructive">
                {state.errors.description[0]}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Beløp inkl. MVA (kr)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {state.errors?.amount && (
                <p className="text-xs text-destructive">
                  {state.errors.amount[0]}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mvaRate">MVA-sats</Label>
              <Select
                name="mvaRate"
                value={mvaRate}
                onValueChange={(val: string | null) => {
                  if (val) setMvaRate(val)
                }}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Velg MVA-sats" />
                </SelectTrigger>
                <SelectContent>
                  {MVA_RATES.map((r) => (
                    <SelectItem key={r.rate} value={String(r.rate)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.mvaRate && (
                <p className="text-xs text-destructive">
                  {state.errors.mvaRate[0]}
                </p>
              )}
            </div>
          </div>

          {amountNum > 0 && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Beregnet MVA: </span>
              <span className="font-medium">{formatCurrency(mvaAmountOre)}</span>
              <span className="text-muted-foreground ml-3">Netto: </span>
              <span className="font-medium">{formatCurrency(netOre)}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="categoryId">Kategori</Label>
              <Select
                name="categoryId"
                value={categoryId || undefined}
                onValueChange={(val: string | null) => {
                  if (val) setCategoryId(val)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Velg kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.categoryId && (
                <p className="text-xs text-destructive">
                  {state.errors.categoryId[0]}
                </p>
              )}
              <CategorySuggestion
                description={description}
                amount={amountNum}
                onAccept={(catId) => setCategoryId(catId)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Dato</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {state.errors?.date && (
                <p className="text-xs text-destructive">
                  {state.errors.date[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="receiptUrl">Kvittering (URL, valgfritt)</Label>
            <Input
              id="receiptUrl"
              name="receiptUrl"
              type="url"
              placeholder="https://..."
              defaultValue={expense?.receiptUrl ?? ""}
            />
            {state.errors?.receiptUrl && (
              <p className="text-xs text-destructive">
                {state.errors.receiptUrl[0]}
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
            <Link href="/utgifter" className={buttonVariants({ variant: "outline" })}>Avbryt</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
