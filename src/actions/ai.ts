"use server"

import { getCurrentTeam } from "@/lib/auth-utils"
import { scanReceipt as scanReceiptAI, type OcrResult } from "@/lib/ai/ocr"
import { categorizeTransaction, categorizeBulk, type CategorizationResult, type BulkCategorizationResult } from "@/lib/ai/categorize"
import { preFilterCandidates, reconcileTransactions, type ReconciliationMatch } from "@/lib/ai/reconcile"
import { db } from "@/lib/db"

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
      .filter((e: { category: { name: string } | null }) => e.category)
      .map((e: { description: string; category: { name: string } | null }) => ({ description: e.description, categoryName: e.category!.name }))

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
      .filter((e: { category: { name: string } | null }) => e.category)
      .map((e: { description: string; category: { name: string } | null }) => ({ description: e.description, categoryName: e.category!.name }))

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

export type ReconcileResult = {
  data?: ReconciliationMatch[]
  error?: string
}

export async function getReconciliationSuggestions(batchId: string): Promise<ReconcileResult> {
  try {
    const { team } = await getCurrentTeam()

    const unmatchedTxs = await db.bankTransaction.findMany({
      where: { importBatchId: batchId, teamId: team.id, matched: false },
      select: { id: true, date: true, description: true, amount: true },
    })

    if (unmatchedTxs.length === 0) return { data: [] }

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
      ...expenses.map((e: { id: string; description: string; amount: number; date: Date }) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        date: e.date.toISOString().split("T")[0],
        type: "expense" as const,
      })),
      ...incomes.map((i: { id: string; description: string; amount: number; date: Date }) => ({
        id: i.id,
        description: i.description,
        amount: i.amount,
        date: i.date.toISOString().split("T")[0],
        type: "income" as const,
      })),
    ]

    const transactionsWithCandidates = unmatchedTxs.map((tx: { id: string; date: Date; description: string; amount: number }) => ({
      id: tx.id,
      date: tx.date.toISOString().split("T")[0],
      description: tx.description,
      amount: tx.amount,
      candidates: preFilterCandidates(
        { ...tx, date: tx.date.toISOString().split("T")[0] },
        candidates
      ),
    }))

    const hasCandidates = transactionsWithCandidates.some((t: { candidates: unknown[] }) => t.candidates.length > 0)
    if (!hasCandidates) return { data: [] }

    const result = await reconcileTransactions(transactionsWithCandidates)
    return { data: result.matches }
  } catch {
    return { error: "Kunne ikke generere avstemmingsforslag." }
  }
}
