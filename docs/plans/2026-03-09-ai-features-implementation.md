# AI Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 6 AI-powered features to Bokført: OCR receipt scanning, auto transaction categorization, smart bank reconciliation, AI chatbot, anomaly detection, and smart invoice generation.

**Architecture:** Unified AI service layer at `src/lib/ai/` using OpenAI SDK. GPT-4o for vision (OCR), GPT-4o-mini for everything else. One streaming API route for chatbot, server actions for the rest. All AI responses in Norwegian.

**Tech Stack:** OpenAI SDK (`openai` npm package), Next.js 16 server actions, streaming API routes, React 19 client components, Prisma 7, shadcn/ui, Tailwind CSS 4.

**Design doc:** `docs/plans/2026-03-09-ai-features-design.md`

---

## Task 1: Install OpenAI SDK and Set Up AI Client

**Files:**
- Modify: `.env.example`
- Create: `src/lib/ai/client.ts`

**Step 1: Install the openai package**

Run: `npm install openai`
Expected: Package added to package.json dependencies

**Step 2: Add env variable to .env.example**

Add `OPENAI_API_KEY=` to `.env.example` after the existing variables.

**Step 3: Create the OpenAI client singleton**

Create `src/lib/ai/client.ts`:

```ts
import OpenAI from "openai"

const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined
}

export const openai = globalForOpenAI.openai ?? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/ai/client.ts
git commit -m "feat: add OpenAI SDK and AI client singleton"
```

---

## Task 2: Receipt OCR Scanning — AI Service

**Files:**
- Create: `src/lib/ai/ocr.ts`

**Step 1: Create the OCR service**

Create `src/lib/ai/ocr.ts`:

```ts
import { openai } from "./client"

export type OcrResult = {
  description: string
  amount: number
  date: string
  mvaRate: 0 | 12 | 15 | 25
  suggestedCategory: string
  confidence: number
}

export async function scanReceipt(base64Image: string, mimeType: string): Promise<OcrResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content: `Du er en norsk kvitteringsleser. Analyser bildet og ekstraher følgende felter som JSON:
- "description": Butikknavn og hva som ble kjøpt (kort beskrivelse på norsk)
- "amount": Totalbeløp i NOK (kroner, ikke øre). Bruk negativt tall hvis det er en kreditnota.
- "date": Dato i format YYYY-MM-DD
- "mvaRate": MVA-sats som ble brukt (0, 12, 15, eller 25). Standard er 25 hvis ukjent.
- "suggestedCategory": Foreslått utgiftskategori på norsk (f.eks. "Kontorrekvisita", "Reise", "Mat og drikke", "Programvare", "Telefon og internett")
- "confidence": Konfidens fra 0 til 1 for kvaliteten på ekstraksjonen

Returner kun gyldig JSON. Hvis bildet ikke er en kvittering, returner confidence: 0.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("No response from OCR")
  }

  const parsed = JSON.parse(content) as OcrResult

  // Validate mvaRate
  if (![0, 12, 15, 25].includes(parsed.mvaRate)) {
    parsed.mvaRate = 25
  }

  return parsed
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/ocr.ts
git commit -m "feat: add receipt OCR scanning service with GPT-4o vision"
```

---

## Task 3: Receipt OCR Scanning — Server Action

**Files:**
- Create: `src/actions/ai.ts`

**Step 1: Create the AI server actions file with scanReceipt action**

Create `src/actions/ai.ts`:

```ts
"use server"

import { getCurrentTeam } from "@/lib/auth-utils"
import { scanReceipt as scanReceiptAI, type OcrResult } from "@/lib/ai/ocr"

export type ScanReceiptResult = {
  data?: OcrResult
  error?: string
}

export async function scanReceiptAction(formData: FormData): Promise<ScanReceiptResult> {
  try {
    // Ensure user is authenticated
    await getCurrentTeam()

    const file = formData.get("receipt") as File | null
    if (!file || file.size === 0) {
      return { error: "Ingen fil valgt." }
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return { error: "Ugyldig filtype. Bruk JPEG, PNG, WebP eller PDF." }
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return { error: "Filen er for stor. Maks 10 MB." }
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    const result = await scanReceiptAI(base64, file.type)
    return { data: result }
  } catch {
    return { error: "Kunne ikke lese kvitteringen. Prøv igjen." }
  }
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/actions/ai.ts
git commit -m "feat: add scanReceipt server action"
```

---

## Task 4: Receipt OCR Scanning — ReceiptDropZone Component

**Files:**
- Create: `src/components/receipt-dropzone.tsx`

**Step 1: Create the ReceiptDropZone component**

Create `src/components/receipt-dropzone.tsx`:

```tsx
"use client"

import { useState, useCallback, useRef } from "react"
import { scanReceiptAction, type ScanReceiptResult } from "@/actions/ai"
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type OcrData = NonNullable<ScanReceiptResult["data"]>

type ReceiptDropZoneProps = {
  onScanComplete: (data: OcrData) => void
}

export function ReceiptDropZone({ onScanComplete }: ReceiptDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setSuccess(false)
    setIsScanning(true)

    try {
      const formData = new FormData()
      formData.append("receipt", file)

      const result = await scanReceiptAction(formData)

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        if (result.data.confidence < 0.3) {
          setError("Kunne ikke lese kvitteringen. Prøv et tydeligere bilde.")
        } else {
          setSuccess(true)
          onScanComplete(result.data)
          // Reset success after 3 seconds
          setTimeout(() => setSuccess(false), 3000)
        }
      }
    } catch {
      setError("Noe gikk galt. Prøv igjen.")
    } finally {
      setIsScanning(false)
    }
  }, [onScanComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-selected
    e.target.value = ""
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        isDragging && "border-primary bg-primary/5",
        isScanning && "pointer-events-none opacity-70",
        success && "border-emerald-500 bg-emerald-500/5",
        error && "border-destructive bg-destructive/5",
        !isDragging && !success && !error && "border-muted-foreground/25 hover:border-muted-foreground/50"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />

      {isScanning ? (
        <>
          <Loader2 className="size-8 animate-spin text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Leser kvittering...</p>
          <p className="text-xs text-muted-foreground">AI analyserer bildet</p>
        </>
      ) : success ? (
        <>
          <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
          <p className="text-sm font-medium text-emerald-600">Kvittering lest!</p>
          <p className="text-xs text-muted-foreground">Feltene er fylt ut automatisk</p>
        </>
      ) : error ? (
        <>
          <AlertCircle className="size-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">Klikk eller dra for å prøve igjen</p>
        </>
      ) : (
        <>
          <Upload className="size-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Dra kvittering hit eller klikk for å laste opp</p>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP eller PDF (maks 10 MB)</p>
        </>
      )}
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/receipt-dropzone.tsx
git commit -m "feat: add ReceiptDropZone component with drag & drop"
```

---

## Task 5: Receipt OCR Scanning — Integrate into Expense Form

**Files:**
- Modify: `src/components/expense-form.tsx`

**Step 1: Add ReceiptDropZone to the ExpenseForm**

In `src/components/expense-form.tsx`:

1. Import `ReceiptDropZone` and add state for description
2. Add a callback that auto-fills form fields from OCR data
3. Place the `<ReceiptDropZone>` above the form fields inside the `<CardContent>`

Changes needed:

- Add import: `import { ReceiptDropZone } from "@/components/receipt-dropzone"`
- Add state for controlled description: `const [description, setDescription] = useState(expense?.description ?? "")`
- Add hidden input: `<input type="hidden" name="description" value={description} />`
- Convert description input to controlled
- Add `onScanComplete` handler that:
  - Sets `description` to `data.description`
  - Sets `amount` to `data.amount.toString()`
  - Sets `mvaRate` to `data.mvaRate.toString()`
  - Sets date input value to `data.date`
  - Finds matching category by name and sets it

Key integration: add `<ReceiptDropZone onScanComplete={handleScanComplete} />` right after the `{state.errors?._form && ...}` block and before the description input.

The `handleScanComplete` function:

```ts
const handleScanComplete = useCallback((data: OcrData) => {
  setDescription(data.description)
  setAmount(data.amount.toString())
  setMvaRate(data.mvaRate.toString())
  setDate(data.date)
  // Find matching category
  const matchedCat = categories.find(
    (c) => c.name.toLowerCase() === data.suggestedCategory.toLowerCase()
  )
  if (matchedCat) {
    setCategoryId(matchedCat.id)
  }
}, [categories])
```

This requires converting `date` and `categoryId` to controlled state (currently they use `defaultValue`). Add:
- `const [date, setDate] = useState(defaultDate)`
- `const [categoryId, setCategoryId] = useState(expense?.categoryId ?? "")`

And update the corresponding inputs to use `value` + `onChange` instead of `defaultValue`.

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/expense-form.tsx
git commit -m "feat: integrate OCR receipt scanning into expense form"
```

---

## Task 6: Auto Transaction Categorization — AI Service

**Files:**
- Create: `src/lib/ai/categorize.ts`

**Step 1: Create the categorization service**

Create `src/lib/ai/categorize.ts`:

```ts
import { openai } from "./client"

type CategoryOption = {
  id: string
  name: string
}

type CategorizationHistory = {
  description: string
  categoryName: string
}

export type CategorizationResult = {
  categoryId: string
  categoryName: string
  confidence: number
  reasoning: string
}

export type BulkCategorizationResult = {
  results: Array<{
    index: number
    categoryId: string
    categoryName: string
    confidence: number
    reasoning: string
  }>
}

export async function categorizeTransaction(
  description: string,
  amount: number,
  categories: CategoryOption[],
  history: CategorizationHistory[]
): Promise<CategorizationResult> {
  const historyContext = history.length > 0
    ? `\n\nTidligere kategoriseringer:\n${history.slice(0, 30).map((h) => `- "${h.description}" → ${h.categoryName}`).join("\n")}`
    : ""

  const categoryList = categories.map((c) => `${c.id}: ${c.name}`).join("\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: `Du er en norsk regnskapskategoriserer. Gitt en transaksjonsbeskrivelse og beløp, velg den mest passende kategorien.

Tilgjengelige kategorier:
${categoryList}

${historyContext}

Returner JSON med:
- "categoryId": ID-en til valgt kategori
- "categoryName": Navnet på valgt kategori
- "confidence": Konfidens fra 0 til 1
- "reasoning": Kort forklaring på norsk (maks 20 ord)`,
      },
      {
        role: "user",
        content: `Transaksjon: "${description}", beløp: ${amount} NOK`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("No response from categorization")
  return JSON.parse(content) as CategorizationResult
}

export async function categorizeBulk(
  transactions: Array<{ index: number; description: string; amount: number }>,
  categories: CategoryOption[],
  history: CategorizationHistory[]
): Promise<BulkCategorizationResult> {
  const historyContext = history.length > 0
    ? `\n\nTidligere kategoriseringer:\n${history.slice(0, 50).map((h) => `- "${h.description}" → ${h.categoryName}`).join("\n")}`
    : ""

  const categoryList = categories.map((c) => `${c.id}: ${c.name}`).join("\n")
  const txList = transactions
    .map((t) => `[${t.index}] "${t.description}" (${t.amount} NOK)`)
    .join("\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 1000,
    messages: [
      {
        role: "system",
        content: `Du er en norsk regnskapskategoriserer. Kategoriser alle transaksjonene nedenfor.

Tilgjengelige kategorier:
${categoryList}

${historyContext}

Returner JSON med:
- "results": Array med objekter for hver transaksjon:
  - "index": Transaksjonens indeks
  - "categoryId": ID-en til valgt kategori
  - "categoryName": Navnet på valgt kategori
  - "confidence": Konfidens fra 0 til 1
  - "reasoning": Kort forklaring på norsk (maks 10 ord)`,
      },
      {
        role: "user",
        content: `Transaksjoner:\n${txList}`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("No response from bulk categorization")
  return JSON.parse(content) as BulkCategorizationResult
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/categorize.ts
git commit -m "feat: add AI transaction categorization service"
```

---

## Task 7: Auto Transaction Categorization — Server Action & Integration

**Files:**
- Modify: `src/actions/ai.ts`
- Modify: `src/actions/bank-import.ts`

**Step 1: Add categorization server actions to `src/actions/ai.ts`**

Add to the existing `src/actions/ai.ts`:

```ts
import { categorizeTransaction, categorizeBulk, type CategorizationResult, type BulkCategorizationResult } from "@/lib/ai/categorize"
import { db } from "@/lib/db"

export type CategorizeResult = {
  data?: CategorizationResult
  error?: string
}

export async function categorizeTransactionAction(
  description: string,
  amount: number
): Promise<CategorizeResult> {
  try {
    const { team } = await getCurrentTeam()

    const [categories, recentExpenses] = await Promise.all([
      db.category.findMany({
        where: { OR: [{ teamId: team.id }, { isDefault: true }], type: "EXPENSE" },
        select: { id: true, name: true },
      }),
      db.expense.findMany({
        where: { teamId: team.id, categoryId: { not: null } },
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ])

    const history = recentExpenses
      .filter((e) => e.category)
      .map((e) => ({ description: e.description, categoryName: e.category!.name }))

    const result = await categorizeTransaction(description, amount, categories, history)
    return { data: result }
  } catch {
    return { error: "Kunne ikke kategorisere transaksjonen." }
  }
}

export type BulkCategorizeResult = {
  data?: BulkCategorizationResult
  error?: string
}

export async function categorizeBulkAction(
  transactions: Array<{ index: number; description: string; amount: number }>
): Promise<BulkCategorizeResult> {
  try {
    const { team } = await getCurrentTeam()

    const [categories, recentExpenses] = await Promise.all([
      db.category.findMany({
        where: { OR: [{ teamId: team.id }, { isDefault: true }], type: "EXPENSE" },
        select: { id: true, name: true },
      }),
      db.expense.findMany({
        where: { teamId: team.id, categoryId: { not: null } },
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ])

    const history = recentExpenses
      .filter((e) => e.category)
      .map((e) => ({ description: e.description, categoryName: e.category!.name }))

    // Process in chunks of 20
    const chunks: typeof transactions[] = []
    for (let i = 0; i < transactions.length; i += 20) {
      chunks.push(transactions.slice(i, i + 20))
    }

    const allResults: BulkCategorizationResult["results"] = []
    for (const chunk of chunks) {
      const result = await categorizeBulk(chunk, categories, history)
      allResults.push(...result.results)
    }

    return { data: { results: allResults } }
  } catch {
    return { error: "Kunne ikke kategorisere transaksjonene." }
  }
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/actions/ai.ts
git commit -m "feat: add categorization server actions (single + bulk)"
```

---

## Task 8: Auto Categorization — CategorySuggestion Component

**Files:**
- Create: `src/components/category-suggestion.tsx`
- Modify: `src/components/expense-form.tsx`

**Step 1: Create CategorySuggestion component**

Create `src/components/category-suggestion.tsx`:

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { categorizeTransactionAction } from "@/actions/ai"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CategorySuggestionProps = {
  description: string
  amount: number
  onAccept: (categoryId: string) => void
}

export function CategorySuggestion({ description, amount, onAccept }: CategorySuggestionProps) {
  const [suggestion, setSuggestion] = useState<{
    categoryId: string
    categoryName: string
    confidence: number
    reasoning: string
  } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (description.length < 3 || amount <= 0) {
      setSuggestion(null)
      return
    }

    setDismissed(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const result = await categorizeTransactionAction(description, amount)
      setLoading(false)

      if (result.data && result.data.confidence > 0.5) {
        setSuggestion(result.data)
      } else {
        setSuggestion(null)
      }
    }, 1000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [description, amount])

  if (dismissed || (!loading && !suggestion)) return null

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
      "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
    )}>
      <Sparkles className="size-4 text-blue-500 shrink-0" />
      {loading ? (
        <span className="text-muted-foreground">Foreslår kategori...</span>
      ) : suggestion ? (
        <>
          <span className="text-muted-foreground">Forslag:</span>
          <span className="font-medium">{suggestion.categoryName}</span>
          <span className="text-muted-foreground text-xs">({suggestion.reasoning})</span>
          <div className="ml-auto flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onAccept(suggestion.categoryId)}
            >
              Bruk
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setDismissed(true)}
            >
              <X className="size-3" />
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
```

**Step 2: Integrate into expense form**

In `src/components/expense-form.tsx`, add `<CategorySuggestion>` below the category select:

```tsx
import { CategorySuggestion } from "@/components/category-suggestion"

// After the category Select, add:
<CategorySuggestion
  description={description}
  amount={amountNum}
  onAccept={(catId) => setCategoryId(catId)}
/>
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/category-suggestion.tsx src/components/expense-form.tsx
git commit -m "feat: add AI category suggestion to expense form"
```

---

## Task 9: Smart Bank Reconciliation — AI Service

**Files:**
- Create: `src/lib/ai/reconcile.ts`

**Step 1: Create the reconciliation service**

Create `src/lib/ai/reconcile.ts`:

```ts
import { openai } from "./client"

type Transaction = {
  id: string
  date: string
  description: string
  amount: number
}

type MatchCandidate = {
  id: string
  description: string
  amount: number
  date: string
  type: "expense" | "income"
}

export type ReconciliationMatch = {
  transactionId: string
  matchType: "expense" | "income"
  matchId: string
  confidence: number
  reasoning: string
}

export type ReconciliationResult = {
  matches: ReconciliationMatch[]
}

/**
 * Deterministic pre-filter: find candidates within ±2% amount and ±7 days
 */
export function preFilterCandidates(
  transaction: Transaction,
  candidates: MatchCandidate[]
): MatchCandidate[] {
  const txAmount = Math.abs(transaction.amount)
  const txDate = new Date(transaction.date).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  return candidates.filter((c) => {
    const cAmount = Math.abs(c.amount)
    const amountDiff = Math.abs(txAmount - cAmount) / Math.max(txAmount, 1)
    const dateDiff = Math.abs(new Date(c.date).getTime() - txDate)

    return amountDiff <= 0.02 && dateDiff <= sevenDays
  })
}

/**
 * AI-powered ranking of pre-filtered candidates
 */
export async function reconcileTransactions(
  transactions: Array<Transaction & { candidates: MatchCandidate[] }>
): Promise<ReconciliationResult> {
  if (transactions.length === 0) return { matches: [] }

  // Only send transactions that have candidates
  const withCandidates = transactions.filter((t) => t.candidates.length > 0)
  if (withCandidates.length === 0) return { matches: [] }

  const txDescriptions = withCandidates.map((t) => {
    const candidateList = t.candidates
      .map((c) => `  - [${c.type}:${c.id}] "${c.description}" (${c.amount} øre, ${c.date})`)
      .join("\n")
    return `Transaksjon [${t.id}]: "${t.description}" (${t.amount} øre, ${t.date})\nKandidater:\n${candidateList}`
  }).join("\n\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: `Du er en norsk bankavstemmingsassistent. For hver banktransaksjon, velg den beste kandidaten fra listen, eller hopp over hvis ingen passer godt.

Vurder: beløpsmatch (viktigst), datoproksimitet, og beskrivelseslikhet.

Returner JSON:
{
  "matches": [
    {
      "transactionId": "tx-id",
      "matchType": "expense" eller "income",
      "matchId": "candidate-id",
      "confidence": 0-1,
      "reasoning": "Kort forklaring på norsk"
    }
  ]
}

Kun inkluder matches med confidence > 0.7. Hver kandidat kan bare matches til én transaksjon.`,
      },
      {
        role: "user",
        content: txDescriptions,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("No response from reconciliation")
  const result = JSON.parse(content) as ReconciliationResult

  // Filter to only high confidence
  result.matches = result.matches.filter((m) => m.confidence > 0.7)

  return result
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/reconcile.ts
git commit -m "feat: add smart bank reconciliation AI service"
```

---

## Task 10: Smart Bank Reconciliation — Server Action & Component

**Files:**
- Modify: `src/actions/ai.ts`
- Create: `src/components/reconciliation-suggestions.tsx`

**Step 1: Add reconciliation server action to `src/actions/ai.ts`**

Add to `src/actions/ai.ts`:

```ts
import { preFilterCandidates, reconcileTransactions, type ReconciliationResult, type ReconciliationMatch } from "@/lib/ai/reconcile"

export type ReconcileResult = {
  data?: ReconciliationMatch[]
  error?: string
}

export async function getReconciliationSuggestions(batchId: string): Promise<ReconcileResult> {
  try {
    const { team } = await getCurrentTeam()

    // Get unmatched transactions from this batch
    const unmatchedTxs = await db.bankTransaction.findMany({
      where: { importBatchId: batchId, teamId: team.id, matched: false },
      select: { id: true, date: true, description: true, amount: true },
    })

    if (unmatchedTxs.length === 0) return { data: [] }

    // Get unlinked expenses and incomes
    const [expenses, incomes] = await Promise.all([
      db.expense.findMany({
        where: { teamId: team.id, bankTransaction: null },
        select: { id: true, description: true, amount: true, date: true },
      }),
      db.income.findMany({
        where: { teamId: team.id, bankTransaction: null },
        select: { id: true, description: true, amount: true, date: true },
      }),
    ])

    const candidates = [
      ...expenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        date: e.date.toISOString().split("T")[0],
        type: "expense" as const,
      })),
      ...incomes.map((i) => ({
        id: i.id,
        description: i.description,
        amount: i.amount,
        date: i.date.toISOString().split("T")[0],
        type: "income" as const,
      })),
    ]

    // Pre-filter and prepare for AI
    const transactionsWithCandidates = unmatchedTxs.map((tx) => ({
      id: tx.id,
      date: tx.date.toISOString().split("T")[0],
      description: tx.description,
      amount: tx.amount,
      candidates: preFilterCandidates(
        { ...tx, date: tx.date.toISOString().split("T")[0] },
        candidates
      ),
    }))

    // Only call AI if there are candidates to rank
    const hasCandidates = transactionsWithCandidates.some((t) => t.candidates.length > 0)
    if (!hasCandidates) return { data: [] }

    const result = await reconcileTransactions(transactionsWithCandidates)
    return { data: result.matches }
  } catch {
    return { error: "Kunne ikke generere avstemmingsforslag." }
  }
}
```

**Step 2: Create ReconciliationSuggestions component**

Create `src/components/reconciliation-suggestions.tsx`:

```tsx
"use client"

import { useState, useEffect, useTransition } from "react"
import { getReconciliationSuggestions, type ReconcileResult } from "@/actions/ai"
import { matchTransaction } from "@/actions/bank-import"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Check, X, Loader2 } from "lucide-react"

type ReconciliationSuggestionsProps = {
  batchId: string
}

type Match = NonNullable<ReconcileResult["data"]>[number]

export function ReconciliationSuggestions({ batchId }: ReconciliationSuggestionsProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      const result = await getReconciliationSuggestions(batchId)
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setMatches(result.data)
      }
      setLoading(false)
    }
    load()
  }, [batchId])

  const handleAccept = (match: Match) => {
    startTransition(async () => {
      const result = await matchTransaction(match.transactionId, match.matchType, match.matchId)
      if (!result.error) {
        setAcceptedIds((prev) => new Set(prev).add(match.transactionId))
      }
    })
  }

  const handleDismiss = (transactionId: string) => {
    setDismissedIds((prev) => new Set(prev).add(transactionId))
  }

  const visibleMatches = matches.filter(
    (m) => !acceptedIds.has(m.transactionId) && !dismissedIds.has(m.transactionId)
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">AI analyserer transaksjoner...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || visibleMatches.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-blue-500" />
          AI-forslag ({visibleMatches.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleMatches.map((match) => (
          <div
            key={match.transactionId}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{match.reasoning}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {match.matchType === "expense" ? "Utgift" : "Inntekt"}
                </Badge>
                <Badge
                  variant={match.confidence > 0.9 ? "default" : "secondary"}
                >
                  {Math.round(match.confidence * 100)}% sikker
                </Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={() => handleAccept(match)}
                disabled={isPending}
              >
                <Check className="size-3" />
                Godta
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(match.transactionId)}
              >
                <X className="size-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

**Step 3: Integrate into batch detail page**

In `src/app/(dashboard)/bank-import/[batchId]/page.tsx`, add the `<ReconciliationSuggestions>` component between the page header and the transactions table:

```tsx
import { ReconciliationSuggestions } from "@/components/reconciliation-suggestions"

// Add after the header div and before the transactions Card:
<ReconciliationSuggestions batchId={batchId} />
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/actions/ai.ts src/components/reconciliation-suggestions.tsx src/app/\(dashboard\)/bank-import/\[batchId\]/page.tsx
git commit -m "feat: add AI-powered bank reconciliation suggestions"
```

---

## Task 11: AI Chatbot — Chat Service with Function Calling

**Files:**
- Create: `src/lib/ai/chat.ts`

**Step 1: Create the chat service with function definitions**

Create `src/lib/ai/chat.ts`:

```ts
import type OpenAI from "openai"

export const chatSystemPrompt = `Du er en hjelpsom norsk regnskapsassistent for Bokført. Du svarer på norsk.

Du har tilgang til brukerens regnskapsdata gjennom funksjoner. Bruk dem til å svare på spørsmål om:
- Inntekter og utgifter
- Fakturaer og kundeinfo
- MVA-rapporter og resultatregnskap
- Banktransaksjoner

Regler:
- Svar alltid på norsk
- Formater beløp som norske kroner (kr)
- Beløp i databasen er lagret i øre (1 kr = 100 øre), konverter til kroner i svarene
- Vær kortfattet og presis
- Hvis du ikke finner data, si det ærlig
- Du kan IKKE opprette, endre eller slette data — kun lese`

export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getIncomes",
      description: "Hent inntekter i en gitt periode",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Startdato (YYYY-MM-DD)" },
          endDate: { type: "string", description: "Sluttdato (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getExpenses",
      description: "Hent utgifter i en gitt periode",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Startdato (YYYY-MM-DD)" },
          endDate: { type: "string", description: "Sluttdato (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getInvoices",
      description: "Hent fakturaer, valgfritt filtrert etter status og/eller periode",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["DRAFT", "SENT", "PAID", "OVERDUE"], description: "Valgfri statusfilter" },
          startDate: { type: "string", description: "Valgfri startdato (YYYY-MM-DD)" },
          endDate: { type: "string", description: "Valgfri sluttdato (YYYY-MM-DD)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProfitAndLoss",
      description: "Generer resultatregnskap for en gitt periode",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Startdato (YYYY-MM-DD)" },
          endDate: { type: "string", description: "Sluttdato (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMvaReport",
      description: "Generer MVA-rapport for en gitt periode",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Startdato (YYYY-MM-DD)" },
          endDate: { type: "string", description: "Sluttdato (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCustomers",
      description: "Hent liste over alle kunder",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getBankTransactions",
      description: "Hent banktransaksjoner, valgfritt filtrert etter koblingstatus",
      parameters: {
        type: "object",
        properties: {
          matched: { type: "boolean", description: "Filtrer etter koblet (true) eller ukoblet (false)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getExpensesByCategory",
      description: "Hent utgifter gruppert etter kategori for en gitt periode",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Startdato (YYYY-MM-DD)" },
          endDate: { type: "string", description: "Sluttdato (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
]
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/chat.ts
git commit -m "feat: add chat service with function calling definitions"
```

---

## Task 12: AI Chatbot — Streaming API Route

**Files:**
- Create: `src/app/api/ai/chat/route.ts`

**Step 1: Create the streaming chat API route**

Create `src/app/api/ai/chat/route.ts`:

```ts
import { openai } from "@/lib/ai/client"
import { chatSystemPrompt, chatTools } from "@/lib/ai/chat"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type OpenAI from "openai"

export const runtime = "nodejs"

async function getTeamForUser(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId },
    include: { team: true },
  })
  return membership?.team
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  teamId: string
): Promise<string> {
  const limit = 20

  switch (name) {
    case "getIncomes": {
      const incomes = await db.income.findMany({
        where: {
          teamId,
          date: { gte: new Date(args.startDate as string), lte: new Date(args.endDate as string) },
        },
        take: limit,
        orderBy: { date: "desc" },
        select: { description: true, amount: true, source: true, date: true },
      })
      const total = await db.income.aggregate({
        where: {
          teamId,
          date: { gte: new Date(args.startDate as string), lte: new Date(args.endDate as string) },
        },
        _sum: { amount: true },
        _count: true,
      })
      return JSON.stringify({ incomes, total: total._sum.amount ?? 0, count: total._count })
    }

    case "getExpenses": {
      const expenses = await db.expense.findMany({
        where: {
          teamId,
          date: { gte: new Date(args.startDate as string), lte: new Date(args.endDate as string) },
        },
        take: limit,
        orderBy: { date: "desc" },
        include: { category: { select: { name: true } } },
      })
      const total = await db.expense.aggregate({
        where: {
          teamId,
          date: { gte: new Date(args.startDate as string), lte: new Date(args.endDate as string) },
        },
        _sum: { amount: true },
        _count: true,
      })
      return JSON.stringify({
        expenses: expenses.map((e) => ({
          description: e.description,
          amount: e.amount,
          mvaRate: e.mvaRate,
          category: e.category?.name,
          date: e.date,
        })),
        total: total._sum.amount ?? 0,
        count: total._count,
      })
    }

    case "getInvoices": {
      const where: Record<string, unknown> = { teamId }
      if (args.status) where.status = args.status
      if (args.startDate && args.endDate) {
        where.issueDate = { gte: new Date(args.startDate as string), lte: new Date(args.endDate as string) }
      }
      const invoices = await db.invoice.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } } },
      })
      return JSON.stringify(invoices.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        customer: i.customer.name,
        status: i.status,
        total: i.total,
        issueDate: i.issueDate,
        dueDate: i.dueDate,
      })))
    }

    case "getProfitAndLoss": {
      const [incomeTotal, expenseTotal] = await Promise.all([
        db.income.aggregate({
          where: { teamId, date: { gte: new Date(args.startDate as string), lte: new Date(args.endDate as string) } },
          _sum: { amount: true },
        }),
        db.expense.aggregate({
          where: { teamId, date: { gte: new Date(args.startDate as string), lte: new Date(args.endDate as string) } },
          _sum: { amount: true },
        }),
      ])
      return JSON.stringify({
        totalIncome: incomeTotal._sum.amount ?? 0,
        totalExpenses: expenseTotal._sum.amount ?? 0,
        profit: (incomeTotal._sum.amount ?? 0) - (expenseTotal._sum.amount ?? 0),
      })
    }

    case "getMvaReport": {
      const [invoiceLines, expenses] = await Promise.all([
        db.invoiceLine.findMany({
          where: {
            invoice: {
              teamId,
              status: { in: ["SENT", "PAID"] },
              issueDate: { gte: new Date(args.startDate as string), lte: new Date(args.endDate as string) },
            },
          },
          select: { mvaRate: true, mvaAmount: true, lineTotal: true },
        }),
        db.expense.findMany({
          where: {
            teamId,
            date: { gte: new Date(args.startDate as string), lte: new Date(args.endDate as string) },
          },
          select: { mvaRate: true, mvaAmount: true, amount: true },
        }),
      ])

      const outgoing = new Map<number, number>()
      for (const line of invoiceLines) {
        outgoing.set(line.mvaRate, (outgoing.get(line.mvaRate) ?? 0) + line.mvaAmount)
      }

      const incoming = new Map<number, number>()
      for (const exp of expenses) {
        incoming.set(exp.mvaRate, (incoming.get(exp.mvaRate) ?? 0) + exp.mvaAmount)
      }

      const totalOutgoing = [...outgoing.values()].reduce((s, v) => s + v, 0)
      const totalIncoming = [...incoming.values()].reduce((s, v) => s + v, 0)

      return JSON.stringify({
        outgoing: Object.fromEntries(outgoing),
        incoming: Object.fromEntries(incoming),
        totalOutgoing,
        totalIncoming,
        netMva: totalOutgoing - totalIncoming,
      })
    }

    case "getCustomers": {
      const customers = await db.customer.findMany({
        where: { teamId },
        select: { name: true, email: true, orgNumber: true },
        take: limit,
      })
      return JSON.stringify(customers)
    }

    case "getBankTransactions": {
      const where: Record<string, unknown> = { teamId }
      if (typeof args.matched === "boolean") where.matched = args.matched
      const txs = await db.bankTransaction.findMany({
        where,
        take: limit,
        orderBy: { date: "desc" },
        select: { description: true, amount: true, date: true, matched: true },
      })
      const count = await db.bankTransaction.count({ where })
      return JSON.stringify({ transactions: txs, totalCount: count })
    }

    case "getExpensesByCategory": {
      const expenses = await db.expense.findMany({
        where: {
          teamId,
          date: { gte: new Date(args.startDate as string), lte: new Date(args.endDate as string) },
        },
        include: { category: { select: { name: true } } },
      })

      const byCategory = new Map<string, number>()
      for (const exp of expenses) {
        const catName = exp.category?.name ?? "Ukategorisert"
        byCategory.set(catName, (byCategory.get(catName) ?? 0) + exp.amount)
      }

      return JSON.stringify(Object.fromEntries(byCategory))
    }

    default:
      return JSON.stringify({ error: "Unknown function" })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const team = await getTeamForUser(session.user.id)
  if (!team) {
    return new Response("No team", { status: 403 })
  }

  const { messages } = (await req.json()) as {
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  }

  // Build messages with system prompt
  const allMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: chatSystemPrompt },
    ...messages.slice(-20), // Keep last 20 messages to limit tokens
  ]

  // Function calling loop
  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: allMessages,
    tools: chatTools,
    stream: false,
  })

  // Handle tool calls (max 5 iterations)
  let iterations = 0
  while (response.choices[0]?.message.tool_calls && iterations < 5) {
    const toolCalls = response.choices[0].message.tool_calls
    allMessages.push(response.choices[0].message)

    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments)
      const result = await executeTool(toolCall.function.name, args, team.id)
      allMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      })
    }

    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: allMessages,
      tools: chatTools,
      stream: false,
    })

    iterations++
  }

  // Stream the final response
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      ...allMessages,
      ...(response.choices[0]?.message.content
        ? [{ role: "assistant" as const, content: response.choices[0].message.content }]
        : []),
    ],
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      // If we already have a final answer from function calling, send it directly
      if (response.choices[0]?.message.content && !response.choices[0]?.message.tool_calls) {
        controller.enqueue(encoder.encode(response.choices[0].message.content))
        controller.close()
        return
      }

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content
        if (text) {
          controller.enqueue(encoder.encode(text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/ai/chat/route.ts
git commit -m "feat: add streaming chat API route with function calling"
```

---

## Task 13: AI Chatbot — Chat Bubble Component

**Files:**
- Create: `src/components/ai-chat-bubble.tsx`

**Step 1: Create the AiChatBubble component**

Create `src/components/ai-chat-bubble.tsx`:

```tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, X, Send, Loader2, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  role: "user" | "assistant"
  content: string
}

export function AiChatBubble() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) throw new Error("Chat request failed")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No reader")

      const decoder = new TextDecoder()
      let assistantContent = ""

      setMessages([...newMessages, { role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        assistantContent += decoder.decode(value, { stream: true })
        setMessages([...newMessages, { role: "assistant", content: assistantContent }])
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Beklager, noe gikk galt. Prøv igjen." },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Åpne AI-assistent"
      >
        <Sparkles className="size-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-96 flex-col rounded-xl border bg-background shadow-2xl" style={{ height: "500px" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold">AI-assistent</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Hei! Jeg er din regnskapsassistent.</p>
            <p className="text-xs text-muted-foreground mt-1">Spør meg om inntekter, utgifter, fakturaer eller MVA.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
            <div className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full",
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              {msg.role === "user" ? <User className="size-3" /> : <Bot className="size-3" />}
            </div>
            <div className={cn(
              "rounded-lg px-3 py-2 text-sm max-w-[80%]",
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bot className="size-3" />
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Spør meg om regnskapet ditt..."
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            size="icon-sm"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/ai-chat-bubble.tsx
git commit -m "feat: add floating AI chat bubble component"
```

---

## Task 14: AI Chatbot — Add to Dashboard Layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Add AiChatBubble to the dashboard layout**

In `src/app/(dashboard)/layout.tsx`, add the chat bubble as the last child of the root div:

```tsx
import { AiChatBubble } from "@/components/ai-chat-bubble"

// At the end of the return, before the closing </div>:
<AiChatBubble />
```

The bubble renders client-side and is position:fixed, so it floats over all pages.

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add AI chat bubble to dashboard layout"
```

---

## Task 15: Anomaly Detection — AI Service

**Files:**
- Create: `src/lib/ai/anomaly.ts`

**Step 1: Create the anomaly detection service**

Create `src/lib/ai/anomaly.ts`:

```ts
import { openai } from "./client"

export type Anomaly = {
  type: "duplicate" | "unusual_amount" | "round_number" | "missing_receipt" | "date_gap"
  severity: "low" | "medium" | "high"
  description: string
  transactionIds: string[]
  suggestedAction: string
}

export type AnomalyResult = {
  anomalies: Anomaly[]
}

type ExpenseRecord = {
  id: string
  description: string
  amount: number
  date: string
  mvaRate: number
  receiptUrl: string | null
  categoryName: string | null
}

/**
 * Deterministic pre-scan for obvious anomaly patterns
 */
export function prescanAnomalies(expenses: ExpenseRecord[]): {
  flagged: Anomaly[]
  candidatesForAi: ExpenseRecord[]
} {
  const flagged: Anomaly[] = []
  const candidatesForAi: ExpenseRecord[] = []

  // Check for duplicate payments (same amount + similar description within 7 days)
  for (let i = 0; i < expenses.length; i++) {
    for (let j = i + 1; j < expenses.length; j++) {
      const a = expenses[i]
      const b = expenses[j]
      if (
        a.amount === b.amount &&
        Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) <= 7 * 24 * 60 * 60 * 1000
      ) {
        flagged.push({
          type: "duplicate",
          severity: a.amount > 500000 ? "high" : "medium", // > 5000 NOK in øre
          description: `Mulig dobbeltbetaling: "${a.description}" og "${b.description}" har samme beløp innen 7 dager`,
          transactionIds: [a.id, b.id],
          suggestedAction: "Sjekk om dette er en duplisert betaling og slett den ene om nødvendig.",
        })
      }
    }
  }

  // Check for missing receipts on high-value expenses (> 1000 NOK)
  for (const exp of expenses) {
    if (!exp.receiptUrl && exp.amount > 100000) { // > 1000 NOK in øre
      flagged.push({
        type: "missing_receipt",
        severity: "low",
        description: `Utgiften "${exp.description}" på ${(exp.amount / 100).toFixed(0)} kr mangler kvittering`,
        transactionIds: [exp.id],
        suggestedAction: "Last opp kvittering for denne utgiften.",
      })
    }
  }

  // Collect candidates for AI analysis (unusual amounts, round numbers)
  const categoryAmounts = new Map<string, number[]>()
  for (const exp of expenses) {
    const cat = exp.categoryName ?? "Ukategorisert"
    if (!categoryAmounts.has(cat)) categoryAmounts.set(cat, [])
    categoryAmounts.get(cat)!.push(exp.amount)
  }

  for (const exp of expenses) {
    const cat = exp.categoryName ?? "Ukategorisert"
    const amounts = categoryAmounts.get(cat) ?? []
    if (amounts.length >= 3) {
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
      if (exp.amount > avg * 3) {
        candidatesForAi.push(exp)
      }
    }
    // Round number check (exactly divisible by 100 NOK / 10000 øre, and over 5000 NOK)
    if (exp.amount >= 500000 && exp.amount % 10000 === 0) {
      candidatesForAi.push(exp)
    }
  }

  return { flagged, candidatesForAi }
}

/**
 * AI analysis of flagged candidates
 */
export async function analyzeAnomalies(
  candidates: ExpenseRecord[],
  categoryAverages: Map<string, number>
): Promise<Anomaly[]> {
  if (candidates.length === 0) return []

  const avgContext = [...categoryAverages.entries()]
    .map(([cat, avg]) => `${cat}: gjennomsnitt ${(avg / 100).toFixed(0)} kr`)
    .join("\n")

  const expContext = candidates
    .map((e) => `[${e.id}] "${e.description}" - ${(e.amount / 100).toFixed(0)} kr (${e.categoryName ?? "Ukategorisert"}, ${e.date})`)
    .join("\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: `Du er en norsk regnskapsrevisor. Analyser disse utgiftene for uregelmessigheter.

Gjennomsnitt per kategori:
${avgContext}

Returner JSON:
{
  "anomalies": [
    {
      "type": "unusual_amount" | "round_number",
      "severity": "low" | "medium" | "high",
      "description": "Kort beskrivelse på norsk",
      "transactionIds": ["id1"],
      "suggestedAction": "Hva brukeren bør gjøre"
    }
  ]
}

Kun rapporter reelle uregelmessigheter. Ikke flagg normale utgifter.`,
      },
      {
        role: "user",
        content: `Utgifter å analysere:\n${expContext}`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) return []

  const result = JSON.parse(content) as AnomalyResult
  return result.anomalies ?? []
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/anomaly.ts
git commit -m "feat: add anomaly detection AI service with pre-scan"
```

---

## Task 16: Anomaly Detection — Server Action & Dashboard Component

**Files:**
- Modify: `src/actions/ai.ts`
- Create: `src/components/anomaly-alerts.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Step 1: Add anomaly server action to `src/actions/ai.ts`**

Add to `src/actions/ai.ts`:

```ts
import { prescanAnomalies, analyzeAnomalies, type Anomaly } from "@/lib/ai/anomaly"

export type AnomalyActionResult = {
  data?: Anomaly[]
  error?: string
}

export async function getAnomaliesAction(): Promise<AnomalyActionResult> {
  try {
    const { team } = await getCurrentTeam()

    // Get expenses from last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const expenses = await db.expense.findMany({
      where: { teamId: team.id, date: { gte: ninetyDaysAgo } },
      include: { category: { select: { name: true } } },
      orderBy: { date: "desc" },
    })

    const expenseRecords = expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      date: e.date.toISOString().split("T")[0],
      mvaRate: e.mvaRate,
      receiptUrl: e.receiptUrl,
      categoryName: e.category?.name ?? null,
    }))

    // Step 1: Deterministic pre-scan
    const { flagged, candidatesForAi } = prescanAnomalies(expenseRecords)

    // Step 2: AI analysis (only if there are candidates)
    let aiAnomalies: Anomaly[] = []
    if (candidatesForAi.length > 0) {
      const categoryAmounts = new Map<string, number>()
      const categoryCounts = new Map<string, number>()
      for (const e of expenseRecords) {
        const cat = e.categoryName ?? "Ukategorisert"
        categoryAmounts.set(cat, (categoryAmounts.get(cat) ?? 0) + e.amount)
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1)
      }
      const categoryAverages = new Map<string, number>()
      for (const [cat, total] of categoryAmounts) {
        categoryAverages.set(cat, Math.round(total / (categoryCounts.get(cat) ?? 1)))
      }

      aiAnomalies = await analyzeAnomalies(candidatesForAi.slice(0, 10), categoryAverages)
    }

    return { data: [...flagged, ...aiAnomalies] }
  } catch {
    return { error: "Kunne ikke kjøre uregelmessighetssjekk." }
  }
}
```

**Step 2: Create AnomalyAlerts component**

Create `src/components/anomaly-alerts.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { getAnomaliesAction } from "@/actions/ai"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X, Shield, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Anomaly = {
  type: string
  severity: "low" | "medium" | "high"
  description: string
  transactionIds: string[]
  suggestedAction: string
}

const severityStyles = {
  low: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30",
  medium: "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30",
  high: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
}

const severityIconStyles = {
  low: "text-yellow-500",
  medium: "text-orange-500",
  high: "text-red-500",
}

export function AnomalyAlerts() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const stored = localStorage.getItem("bokfort-dismissed-anomalies")
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    async function load() {
      const result = await getAnomaliesAction()
      if (result.data) {
        setAnomalies(result.data)
      }
      setLoading(false)
    }
    load()
  }, [])

  const dismiss = (index: number) => {
    const key = `${anomalies[index].type}-${anomalies[index].transactionIds.join(",")}`
    const newDismissed = new Set(dismissedIds).add(key)
    setDismissedIds(newDismissed)
    try {
      localStorage.setItem(
        "bokfort-dismissed-anomalies",
        JSON.stringify([...newDismissed])
      )
    } catch { /* ignore */ }
  }

  const visibleAnomalies = anomalies.filter((a, i) => {
    const key = `${a.type}-${a.transactionIds.join(",")}`
    return !dismissedIds.has(key)
  })

  if (loading) return null
  if (visibleAnomalies.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground">
          Uregelmessigheter ({visibleAnomalies.length})
        </h2>
      </div>
      {visibleAnomalies.map((anomaly, index) => (
        <Card key={index} className={cn("border", severityStyles[anomaly.severity])}>
          <CardContent className="flex items-start gap-3 py-3">
            <AlertTriangle className={cn("size-5 shrink-0 mt-0.5", severityIconStyles[anomaly.severity])} />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{anomaly.description}</p>
              <p className="text-xs text-muted-foreground">{anomaly.suggestedAction}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => dismiss(index)}
              className="shrink-0"
            >
              <X className="size-3" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Step 3: Add AnomalyAlerts to dashboard page**

In `src/app/(dashboard)/dashboard/page.tsx`, add the component after the page header and before the summary cards:

```tsx
import { AnomalyAlerts } from "@/components/anomaly-alerts"

// After the page header div and before the summary cards grid:
<AnomalyAlerts />
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/actions/ai.ts src/components/anomaly-alerts.tsx src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: add anomaly detection alerts on dashboard"
```

---

## Task 17: Smart Invoice Generation — AI Service

**Files:**
- Create: `src/lib/ai/invoice.ts`

**Step 1: Create the smart invoice service**

Create `src/lib/ai/invoice.ts`:

```ts
import { openai } from "./client"

type PastInvoiceLine = {
  description: string
  quantity: number
  unitPrice: number
  mvaRate: number
}

type PastInvoice = {
  invoiceNumber: number
  issueDate: string
  lines: PastInvoiceLine[]
  notes: string | null
}

export type SuggestedLine = {
  description: string
  quantity: number
  unitPrice: number
  mvaRate: 0 | 12 | 15 | 25
}

export type InvoiceSuggestion = {
  lines: SuggestedLine[]
  notes: string
}

export async function suggestInvoiceLines(
  customerName: string,
  pastInvoices: PastInvoice[],
  briefDescription?: string
): Promise<InvoiceSuggestion> {
  const historyContext = pastInvoices.length > 0
    ? `\n\nTidligere fakturaer til denne kunden:\n${pastInvoices.map((inv) => {
        const lines = inv.lines.map((l) => `  - ${l.description} (${l.quantity}x, ${(l.unitPrice / 100).toFixed(0)} kr, MVA ${l.mvaRate}%)`).join("\n")
        return `Faktura #${inv.invoiceNumber} (${inv.issueDate}):\n${lines}${inv.notes ? `\n  Notater: ${inv.notes}` : ""}`
      }).join("\n\n")}`
    : ""

  const userPrompt = briefDescription
    ? `Kunden "${customerName}" trenger en faktura for: ${briefDescription}`
    : `Kunden "${customerName}" trenger en ny faktura. Foreslå linjer basert på historikk.`

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content: `Du er en norsk fakturagenerator. Foreslå profesjonelle fakturalinjer.
${historyContext}

Regler:
- Beskrivelser skal være profesjonelle og på norsk
- unitPrice er i øre (1 kr = 100 øre)
- Velg riktig MVA-sats (0, 12, 15 eller 25). Standard er 25%.
- Hvis det finnes historikk, bruk lignende priser og beskrivelser
- Hvis det er en kort beskrivelse, utvid til profesjonelle fakturalinjer

Returner JSON:
{
  "lines": [
    {
      "description": "Profesjonell beskrivelse",
      "quantity": 1,
      "unitPrice": 150000,
      "mvaRate": 25
    }
  ],
  "notes": "Valgfrie fakturanotater"
}`,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("No response from invoice generation")

  const result = JSON.parse(content) as InvoiceSuggestion

  // Validate mvaRates
  for (const line of result.lines) {
    if (![0, 12, 15, 25].includes(line.mvaRate)) {
      line.mvaRate = 25
    }
  }

  return result
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/invoice.ts
git commit -m "feat: add smart invoice generation AI service"
```

---

## Task 18: Smart Invoice Generation — Server Action & Component

**Files:**
- Modify: `src/actions/ai.ts`
- Create: `src/components/invoice-suggestions.tsx`
- Modify: `src/components/invoice-form.tsx`

**Step 1: Add invoice suggestion server action to `src/actions/ai.ts`**

Add to `src/actions/ai.ts`:

```ts
import { suggestInvoiceLines, type InvoiceSuggestion } from "@/lib/ai/invoice"

export type InvoiceSuggestionResult = {
  data?: InvoiceSuggestion
  error?: string
}

export async function getInvoiceSuggestions(
  customerId: string,
  briefDescription?: string
): Promise<InvoiceSuggestionResult> {
  try {
    const { team } = await getCurrentTeam()

    const customer = await db.customer.findFirst({
      where: { id: customerId, teamId: team.id },
      select: { name: true },
    })

    if (!customer) return { error: "Kunde ikke funnet." }

    // Get last 3 invoices for this customer
    const pastInvoices = await db.invoice.findMany({
      where: { customerId, teamId: team.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        lines: {
          select: { description: true, quantity: true, unitPrice: true, mvaRate: true },
        },
      },
    })

    const history = pastInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate.toISOString().split("T")[0],
      lines: inv.lines,
      notes: inv.notes,
    }))

    const result = await suggestInvoiceLines(customer.name, history, briefDescription)
    return { data: result }
  } catch {
    return { error: "Kunne ikke generere forslag." }
  }
}
```

**Step 2: Create InvoiceSuggestions component**

Create `src/components/invoice-suggestions.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { getInvoiceSuggestions } from "@/actions/ai"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Sparkles, Check, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type SuggestedLine = {
  description: string
  quantity: number
  unitPrice: number
  mvaRate: 0 | 12 | 15 | 25
}

type InvoiceSuggestionsProps = {
  customerId: string
  onAccept: (lines: SuggestedLine[], notes: string) => void
}

export function InvoiceSuggestions({ customerId, onAccept }: InvoiceSuggestionsProps) {
  const [suggestion, setSuggestion] = useState<{ lines: SuggestedLine[]; notes: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!customerId) {
      setSuggestion(null)
      return
    }

    setDismissed(false)
    setLoading(true)

    getInvoiceSuggestions(customerId).then((result) => {
      if (result.data && result.data.lines.length > 0) {
        setSuggestion(result.data)
      } else {
        setSuggestion(null)
      }
      setLoading(false)
    })
  }, [customerId])

  if (dismissed || (!loading && !suggestion)) return null

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-blue-500" />
          <span className="text-sm font-medium">AI-forslag basert på tidligere fakturaer</span>
        </div>
        <div className="flex gap-1">
          {suggestion && (
            <Button
              type="button"
              size="sm"
              onClick={() => onAccept(suggestion.lines, suggestion.notes)}
            >
              <Check className="size-3" />
              Bruk forslag
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Genererer forslag...</span>
        </div>
      ) : suggestion ? (
        <div className="space-y-2">
          {suggestion.lines.map((line, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>
                {line.description} ({line.quantity}x)
              </span>
              <span className="font-medium">
                {formatCurrency(line.unitPrice * line.quantity)} + {line.mvaRate}% MVA
              </span>
            </div>
          ))}
          {suggestion.notes && (
            <p className="text-xs text-muted-foreground mt-2">Notater: {suggestion.notes}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
```

**Step 3: Integrate into InvoiceForm**

In `src/components/invoice-form.tsx`, add `<InvoiceSuggestions>` below the customer selector:

```tsx
import { InvoiceSuggestions } from "@/components/invoice-suggestions"
import { oreToKroner } from "@/lib/utils"

// After the customer selector div, before Dates:
{!invoice && customerId && (
  <InvoiceSuggestions
    customerId={customerId}
    onAccept={(suggestedLines, suggestedNotes) => {
      setLines(suggestedLines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPriceKroner: oreToKroner(l.unitPrice),
        mvaRate: l.mvaRate,
      })))
      if (suggestedNotes) setNotes(suggestedNotes)
    }}
  />
)}
```

Only show suggestions for new invoices (not editing), and only when a customer is selected.

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/actions/ai.ts src/components/invoice-suggestions.tsx src/components/invoice-form.tsx
git commit -m "feat: add smart invoice generation with AI suggestions"
```

---

## Task 19: Final Integration — Verify All Features Build

**Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors (or only pre-existing warnings)

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Fix any issues found**

Address any TypeScript errors, import issues, or build failures.

**Step 5: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues from AI feature integration"
```

---

## Summary

| Task | Feature | Files |
|------|---------|-------|
| 1 | Setup | `lib/ai/client.ts`, `.env.example` |
| 2-5 | OCR Scanning | `lib/ai/ocr.ts`, `actions/ai.ts`, `components/receipt-dropzone.tsx`, `components/expense-form.tsx` |
| 6-8 | Auto Categorization | `lib/ai/categorize.ts`, `actions/ai.ts`, `components/category-suggestion.tsx`, `components/expense-form.tsx` |
| 9-10 | Smart Reconciliation | `lib/ai/reconcile.ts`, `actions/ai.ts`, `components/reconciliation-suggestions.tsx`, batch page |
| 11-14 | AI Chatbot | `lib/ai/chat.ts`, `api/ai/chat/route.ts`, `components/ai-chat-bubble.tsx`, dashboard layout |
| 15-16 | Anomaly Detection | `lib/ai/anomaly.ts`, `actions/ai.ts`, `components/anomaly-alerts.tsx`, dashboard page |
| 17-18 | Smart Invoices | `lib/ai/invoice.ts`, `actions/ai.ts`, `components/invoice-suggestions.tsx`, `components/invoice-form.tsx` |
| 19 | Final Build Check | All files |
