"use client"

import { useState, useTransition } from "react"
import { matchTransaction, createFromTransaction } from "@/actions/bank-import"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Link2, PlusCircle } from "lucide-react"

type MatchableItem = {
  id: string
  description: string
  amount: number
  date: Date | string
}

type CategoryItem = {
  id: string
  name: string
  type: string
}

type TransactionMatcherProps = {
  transactionId: string
  transactionAmount: number
  expenses: MatchableItem[]
  incomes: MatchableItem[]
  categories: CategoryItem[]
}

export function TransactionMatcher({
  transactionId,
  transactionAmount,
  expenses,
  incomes,
  categories,
}: TransactionMatcherProps) {
  const isNegative = transactionAmount < 0
  const suggestedType = isNegative ? "expense" : "income"

  return (
    <div className="flex gap-1">
      <MatchExistingDialog
        transactionId={transactionId}
        suggestedType={suggestedType}
        expenses={expenses}
        incomes={incomes}
      />
      <CreateNewDialog
        transactionId={transactionId}
        suggestedType={suggestedType}
        categories={categories}
      />
    </div>
  )
}

function MatchExistingDialog({
  transactionId,
  suggestedType,
  expenses,
  incomes,
}: {
  transactionId: string
  suggestedType: "expense" | "income"
  expenses: MatchableItem[]
  incomes: MatchableItem[]
}) {
  const [type, setType] = useState<"expense" | "income">(suggestedType)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const items = type === "expense" ? expenses : incomes

  function handleSubmit() {
    if (!targetId) {
      setError("Velg en post å koble til.")
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await matchTransaction(transactionId, type, targetId)
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setTargetId(null)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="xs" />}
      >
        <Link2 className="size-3" />
        Koble
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Koble til eksisterende</DialogTitle>
          <DialogDescription>
            Koble denne transaksjonen til en eksisterende utgift eller inntekt
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(val: string | null) => {
                if (val === "expense" || val === "income") {
                  setType(val)
                  setTargetId(null)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Utgift</SelectItem>
                <SelectItem value="income">Inntekt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              {type === "expense" ? "Velg utgift" : "Velg inntekt"}
            </Label>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen ukoblede {type === "expense" ? "utgifter" : "inntekter"}{" "}
                funnet.
              </p>
            ) : (
              <Select
                value={targetId ?? undefined}
                onValueChange={(val: string | null) => setTargetId(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      type === "expense" ? "Velg utgift..." : "Velg inntekt..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.description} ({formatCurrency(item.amount)},{" "}
                      {formatDate(item.date)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Avbryt
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending || !targetId}>
            {isPending ? "Kobler..." : "Koble"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateNewDialog({
  transactionId,
  suggestedType,
  categories,
}: {
  transactionId: string
  suggestedType: "expense" | "income"
  categories: CategoryItem[]
}) {
  const [type, setType] = useState<"expense" | "income">(suggestedType)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const filteredCategories = categories.filter(
    (c) => c.type === (type === "expense" ? "EXPENSE" : "INCOME")
  )

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createFromTransaction(
        transactionId,
        type,
        categoryId || undefined
      )
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setCategoryId(null)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="xs" />}
      >
        <PlusCircle className="size-3" />
        Ny
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Opprett ny</DialogTitle>
          <DialogDescription>
            Opprett en ny utgift eller inntekt fra denne transaksjonen
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(val: string | null) => {
                if (val === "expense" || val === "income") {
                  setType(val)
                  setCategoryId(null)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Utgift</SelectItem>
                <SelectItem value="income">Inntekt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "expense" && filteredCategories.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Kategori (valgfritt)</Label>
              <Select
                value={categoryId ?? undefined}
                onValueChange={(val: string | null) => setCategoryId(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Velg kategori..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Avbryt
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Oppretter..." : "Opprett"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
