"use server"

import { getCurrentTeam } from "@/lib/auth-utils"
import { scanReceipt as scanReceiptAI, type OcrResult } from "@/lib/ai/ocr"
import { categorizeTransaction, categorizeBulk, type CategorizationResult, type BulkCategorizationResult } from "@/lib/ai/categorize"
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
