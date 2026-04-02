"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  getReconciliationSuggestions,
  type ReconcileResult,
} from "@/actions/ai"
import { matchTransaction, createFromTransaction } from "@/actions/bank-import"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  Landmark,
  FileText,
  Sparkles,
  Link2,
  PlusCircle,
  Plus,
  Check,
  X,
  Loader2,
  CheckCircle2,
  Save,
  Trash2,
  Flag,
  MousePointerClick,
} from "lucide-react"

// ---- Types ----

type SerializedTransaction = {
  id: string
  date: string
  description: string
  amount: number
  matched: boolean
  expense: {
    id: string
    description: string
    amount: number
    date: string
  } | null
  income: {
    id: string
    description: string
    amount: number
    date: string
  } | null
}

type MatchableItem = {
  id: string
  description: string
  amount: number
  date: string
}

type CategoryItem = {
  id: string
  name: string
  type: string
}

type AIMatch = NonNullable<ReconcileResult["data"]>[number]

type BankReconciliationViewProps = {
  batchId: string
  transactions: SerializedTransaction[]
  expenses: MatchableItem[]
  incomes: MatchableItem[]
  categories: CategoryItem[]
  matchedCount: number
  totalCount: number
}

// ---- Main Component ----

export function BankReconciliationView({
  batchId,
  transactions,
  expenses,
  incomes,
  categories,
  matchedCount,
  totalCount,
}: BankReconciliationViewProps) {
  const router = useRouter()
  const [aiMatches, setAiMatches] = useState<AIMatch[]>([])
  const [aiLoading, setAiLoading] = useState(true)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

  // Load AI suggestions
  useEffect(() => {
    async function loadSuggestions() {
      const result = await getReconciliationSuggestions(batchId)
      if (result.data) {
        setAiMatches(result.data)
      }
      setAiLoading(false)
    }
    loadSuggestions()
  }, [batchId])

  const handleAcceptAiMatch = (match: AIMatch) => {
    startTransition(async () => {
      const result = await matchTransaction(
        match.transactionId,
        match.matchType,
        match.matchId
      )
      if (!result.error) {
        setAcceptedIds((prev) => new Set(prev).add(match.transactionId))
        router.refresh()
      }
    })
  }

  const handleDismissAiMatch = (transactionId: string) => {
    setDismissedIds((prev) => new Set(prev).add(transactionId))
  }

  // Separate matched and unmatched transactions
  const unmatchedTransactions = transactions.filter(
    (t) => !t.matched && !acceptedIds.has(t.id)
  )
  const matchedTransactions = transactions.filter(
    (t) => t.matched || acceptedIds.has(t.id)
  )

  // Build AI suggestion map for quick lookup
  const aiMatchMap = new Map<string, AIMatch>()
  for (const m of aiMatches) {
    if (!acceptedIds.has(m.transactionId) && !dismissedIds.has(m.transactionId)) {
      aiMatchMap.set(m.transactionId, m)
    }
  }

  // Get the AI match for the selected transaction, or find one
  const selectedTx = selectedTxId
    ? unmatchedTransactions.find((t) => t.id === selectedTxId)
    : unmatchedTransactions[0] ?? null

  const currentAiMatch = selectedTx
    ? aiMatchMap.get(selectedTx.id) ?? null
    : null

  return (
    <>
      {/* Side-by-side reconciliation view */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left column: Bank Statement */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Landmark className="size-5 text-primary" />
              Bankkontoutskrift
            </h3>
            <span className="rounded bg-muted px-2 py-1 text-xs font-semibold">
              {transactions.length} transaksjoner
            </span>
          </div>

          <div className="space-y-3">
            {/* Unmatched transactions */}
            {unmatchedTransactions.map((tx) => {
              const isPositive = tx.amount > 0
              const isSelected = selectedTx?.id === tx.id
              const hasAiMatch = aiMatchMap.has(tx.id)

              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelectedTxId(tx.id)}
                  className={`w-full rounded-xl border-l-4 bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md ${
                    isSelected
                      ? "border-l-primary ring-2 ring-primary/20"
                      : hasAiMatch
                        ? "border-l-amber-400"
                        : "border-l-primary"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {formatDate(tx.date)}
                      </p>
                      <p className="font-bold">{tx.description}</p>
                      {hasAiMatch && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Sparkles className="size-3" />
                          AI-forslag tilgjengelig
                        </p>
                      )}
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        isPositive ? "text-primary" : ""
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </button>
              )
            })}

            {/* Matched transactions (collapsed) */}
            {matchedTransactions.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Avstemte transaksjoner ({matchedTransactions.length})
                </p>
                {matchedTransactions.map((tx) => {
                  const isPositive = tx.amount > 0
                  const linkedDescription =
                    tx.expense?.description || tx.income?.description || ""

                  return (
                    <div
                      key={tx.id}
                      className="rounded-xl border-l-4 border-l-primary/30 bg-card/60 p-3 opacity-70"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(tx.date)}
                          </p>
                          <p className="text-sm font-medium">
                            {tx.description}
                          </p>
                          {linkedDescription && (
                            <p className="flex items-center gap-1 text-xs text-primary">
                              <CheckCircle2 className="size-3" />
                              Koblet til: {linkedDescription}
                            </p>
                          )}
                        </div>
                        <p
                          className={`text-sm font-bold ${
                            isPositive ? "text-primary" : ""
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty state */}
            {transactions.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Ingen transaksjoner i denne importen
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Suggested Matches */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <FileText className="size-5 text-primary" />
              Foreslatte treff
            </h3>
          </div>

          <div className="space-y-3">
            {/* AI loading state */}
            {aiLoading && (
              <div className="flex min-h-[105px] items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">
                    AI analyserer transaksjoner...
                  </span>
                </div>
              </div>
            )}

            {/* AI suggestion for the selected transaction */}
            {!aiLoading && selectedTx && currentAiMatch && (
              <SuggestionCard
                match={currentAiMatch}
                onAccept={handleAcceptAiMatch}
                onDismiss={handleDismissAiMatch}
                isPending={isPending}
              />
            )}

            {/* Manual matching for the selected transaction */}
            {!aiLoading && selectedTx && (
              <div className="space-y-3">
                {/* Match to existing */}
                <MatchExistingCard
                  transaction={selectedTx}
                  expenses={expenses}
                  incomes={incomes}
                />

                {/* Create new entry */}
                <CreateNewCard
                  transaction={selectedTx}
                  categories={categories}
                />

                {/* Empty state for "no match" */}
                {!currentAiMatch && (
                  <div className="flex min-h-[105px] items-center justify-center rounded-xl border border-dashed bg-card p-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Ingen automatisk treff funnet
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Bruk knappene over for manuell kobling
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No selection state */}
            {!aiLoading && !selectedTx && unmatchedTransactions.length === 0 && (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed bg-primary/5 p-6 text-center">
                <CheckCircle2 className="mb-2 size-10 text-primary" />
                <p className="font-bold text-primary">Alle transaksjoner er avstemt!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {matchedCount + acceptedIds.size} av {totalCount} transaksjoner er koblet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar: Bulk actions */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border bg-card p-4 sm:flex-row">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Massehandlinger:
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              <MousePointerClick className="size-3" />
              Velg avstemte
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Flag className="size-3" />
              Flagg gjenstående
            </Button>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Trash2 className="size-3" />
            Forkast endringer
          </Button>
          <Button size="sm">
            <Save className="size-3" />
            Lagre og synkroniser
          </Button>
        </div>
      </div>
    </>
  )
}

// ---- Suggestion Card (AI match) ----

function SuggestionCard({
  match,
  onAccept,
  onDismiss,
  isPending,
}: {
  match: AIMatch
  onAccept: (match: AIMatch) => void
  onDismiss: (transactionId: string) => void
  isPending: boolean
}) {
  const confidencePercent = Math.round(match.confidence * 100)

  return (
    <div className="flex min-h-[105px] flex-col justify-between rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 dark:bg-primary/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">{match.reasoning}</p>
            <p className="text-xs italic text-muted-foreground">
              {confidencePercent}% sannsynlighet
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => onDismiss(match.transactionId)}
          >
            <X className="size-3" />
          </Button>
          <Button
            size="xs"
            onClick={() => onAccept(match)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Check className="size-3" />
            )}
            Koble
          </Button>
        </div>
      </div>
      <div className="mt-2 flex justify-between border-t border-primary/10 pt-2">
        <span className="text-xs font-medium text-muted-foreground">
          Type: {match.matchType === "expense" ? "Utgift" : "Inntekt"}
        </span>
        <Badge
          variant={match.confidence > 0.9 ? "default" : "secondary"}
          className="text-xs"
        >
          {confidencePercent}% sikker
        </Badge>
      </div>
    </div>
  )
}

// ---- Match Existing Card ----

function MatchExistingCard({
  transaction,
  expenses,
  incomes,
}: {
  transaction: SerializedTransaction
  expenses: MatchableItem[]
  incomes: MatchableItem[]
}) {
  const isNegative = transaction.amount < 0
  const suggestedType = isNegative ? "expense" : "income"

  const [type, setType] = useState<"expense" | "income">(suggestedType)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const items = type === "expense" ? expenses : incomes

  function handleSubmit() {
    if (!targetId) {
      setError("Velg en post a koble til.")
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await matchTransaction(transaction.id, type, targetId)
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setTargetId(null)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10 dark:bg-primary/10"
          />
        }
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/20">
          <Link2 className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold">Koble til eksisterende post</p>
          <p className="text-xs text-muted-foreground">
            Match med en eksisterende utgift eller inntekt
          </p>
        </div>
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

          {/* Transaction info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Transaksjon:</p>
            <p className="text-sm font-medium">{transaction.description}</p>
            <p className="text-sm font-bold">
              {formatCurrency(transaction.amount)}
            </p>
          </div>

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
                Ingen ukoblede{" "}
                {type === "expense" ? "utgifter" : "inntekter"} funnet.
              </p>
            ) : (
              <Select
                value={targetId ?? undefined}
                onValueChange={(val: string | null) => setTargetId(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      type === "expense"
                        ? "Velg utgift..."
                        : "Velg inntekt..."
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

// ---- Create New Card ----

function CreateNewCard({
  transaction,
  categories,
}: {
  transaction: SerializedTransaction
  categories: CategoryItem[]
}) {
  const isNegative = transaction.amount < 0
  const suggestedType = isNegative ? "expense" : "income"

  const [type, setType] = useState<"expense" | "income">(suggestedType)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const filteredCategories = categories.filter(
    (c) => c.type === (type === "expense" ? "EXPENSE" : "INCOME")
  )

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createFromTransaction(
        transaction.id,
        type,
        categoryId || undefined
      )
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setCategoryId(null)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-dashed bg-card p-4 text-left transition-colors hover:bg-muted"
          />
        }
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-muted">
          <Plus className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold">Opprett ny post</p>
          <p className="text-xs text-muted-foreground">
            Opprett en ny utgift eller inntekt fra transaksjonen
          </p>
        </div>
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

          {/* Transaction info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Transaksjon:</p>
            <p className="text-sm font-medium">{transaction.description}</p>
            <p className="text-sm font-bold">
              {formatCurrency(transaction.amount)}
            </p>
          </div>

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
