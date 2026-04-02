"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { parseBankCsv } from "@/lib/csv-parser"
import { createJournalEntry } from "@/lib/accounting"
import { resolveExpenseAccountCode } from "@/lib/kontoplan"
import { revalidatePath } from "next/cache"

export type ImportCsvState = {
  errors?: {
    _form?: string[]
  }
  batchId?: string
}

export async function importCsv(
  _prevState: ImportCsvState,
  formData: FormData
): Promise<ImportCsvState> {
  try {
    const file = formData.get("csvFile") as File | null

    if (!file || file.size === 0) {
      return {
        errors: { _form: ["Vennligst velg en CSV-fil."] },
      }
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      return {
        errors: { _form: ["Filen er for stor. Maksimal størrelse er 5 MB."] },
      }
    }

    const allowedTypes = ["text/csv", "text/plain", "application/csv", "application/vnd.ms-excel"]
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    if (!allowedTypes.includes(file.type) && fileExtension !== "csv") {
      return {
        errors: { _form: ["Kun CSV-filer er tillatt."] },
      }
    }

    const csvContent = await file.text()
    const parsed = parseBankCsv(csvContent)

    if (parsed.length === 0) {
      return {
        errors: {
          _form: [
            "Ingen transaksjoner funnet i filen. Sjekk at formatet er riktig.",
          ],
        },
      }
    }

    const { team, user } = await getCurrentTeam()

    const batch = await db.importBatch.create({
      data: {
        filename: file.name,
        teamId: team.id,
        importedById: user.id,
        transactions: {
          create: parsed.map((tx) => ({
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            balance: tx.balance,
            teamId: team.id,
          })),
        },
      },
    })

    revalidatePath("/bank-import")
    return { batchId: batch.id }
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt under import. Vennligst prøv igjen."],
      },
    }
  }
}

export async function matchTransaction(
  transactionId: string,
  type: "expense" | "income",
  targetId: string
): Promise<{ error?: string }> {
  try {
    const { team } = await getCurrentTeam()

    const transaction = await db.bankTransaction.findFirst({
      where: { id: transactionId, teamId: team.id },
    })

    if (!transaction) {
      return { error: "Transaksjonen ble ikke funnet." }
    }

    if (transaction.matched) {
      return { error: "Transaksjonen er allerede koblet." }
    }

    if (type === "expense") {
      const expense = await db.expense.findFirst({
        where: { id: targetId, teamId: team.id },
      })
      if (!expense) {
        return { error: "Utgiften ble ikke funnet." }
      }

      await db.bankTransaction.update({
        where: { id: transactionId },
        data: {
          matched: true,
          expenseId: targetId,
        },
      })
    } else {
      const income = await db.income.findFirst({
        where: { id: targetId, teamId: team.id },
      })
      if (!income) {
        return { error: "Inntekten ble ikke funnet." }
      }

      await db.bankTransaction.update({
        where: { id: transactionId },
        data: {
          matched: true,
          incomeId: targetId,
        },
      })
    }

    revalidatePath("/bank-import")
    return {}
  } catch {
    return { error: "Noe gikk galt. Vennligst prøv igjen." }
  }
}

export async function unmatchTransaction(
  transactionId: string
): Promise<{ error?: string }> {
  try {
    const { team } = await getCurrentTeam()

    const transaction = await db.bankTransaction.findFirst({
      where: { id: transactionId, teamId: team.id },
    })

    if (!transaction) {
      return { error: "Transaksjonen ble ikke funnet." }
    }

    if (!transaction.matched) {
      return { error: "Transaksjonen er ikke koblet." }
    }

    await db.bankTransaction.update({
      where: { id: transactionId },
      data: {
        matched: false,
        expenseId: null,
        incomeId: null,
      },
    })

    revalidatePath("/bank-import")
    return {}
  } catch {
    return { error: "Noe gikk galt. Vennligst prøv igjen." }
  }
}

/**
 * Auto-match unmatched bank transactions against existing expenses and incomes
 * using amount and date proximity matching.
 */
export async function autoMatchTransactions(
  batchId: string
): Promise<{ matched: number; error?: string }> {
  try {
    const { team } = await getCurrentTeam()

    // Verify batch belongs to team
    const batch = await db.importBatch.findFirst({
      where: { id: batchId, teamId: team.id },
    })
    if (!batch) {
      return { matched: 0, error: "Importbatch ble ikke funnet." }
    }

    // Get unmatched transactions
    const unmatched = await db.bankTransaction.findMany({
      where: { importBatchId: batchId, teamId: team.id, matched: false },
    })

    if (unmatched.length === 0) {
      return { matched: 0 }
    }

    // Get unmatched expenses and incomes (no bankTransaction linked)
    const expenses = await db.expense.findMany({
      where: {
        teamId: team.id,
        bankTransaction: null,
      },
    })

    const incomes = await db.income.findMany({
      where: {
        teamId: team.id,
        bankTransaction: null,
      },
    })

    let matchCount = 0

    for (const tx of unmatched) {
      const absAmount = Math.abs(tx.amount)
      const txDate = new Date(tx.date).getTime()

      // Negative amounts = expenses, positive = incomes
      if (tx.amount < 0) {
        // Find expense with exact amount and within 3 days
        const match = expenses.find((exp) => {
          const expDate = new Date(exp.date).getTime()
          const daysDiff = Math.abs(txDate - expDate) / (1000 * 60 * 60 * 24)
          return exp.amount === absAmount && daysDiff <= 3
        })

        if (match) {
          await db.bankTransaction.update({
            where: { id: tx.id },
            data: { matched: true, expenseId: match.id },
          })
          // Remove from candidates to prevent double-matching
          const idx = expenses.indexOf(match)
          expenses.splice(idx, 1)
          matchCount++
        }
      } else {
        // Find income with exact amount and within 3 days
        const match = incomes.find((inc) => {
          const incDate = new Date(inc.date).getTime()
          const daysDiff = Math.abs(txDate - incDate) / (1000 * 60 * 60 * 24)
          return inc.amount === absAmount && daysDiff <= 3
        })

        if (match) {
          await db.bankTransaction.update({
            where: { id: tx.id },
            data: { matched: true, incomeId: match.id },
          })
          const idx = incomes.indexOf(match)
          incomes.splice(idx, 1)
          matchCount++
        }
      }
    }

    revalidatePath("/bank-import")
    return { matched: matchCount }
  } catch {
    return { matched: 0, error: "Noe gikk galt under automatisk matching." }
  }
}

export async function createFromTransaction(
  transactionId: string,
  type: "expense" | "income",
  categoryId?: string
): Promise<{ error?: string }> {
  try {
    const { team, user } = await getCurrentTeam()

    const transaction = await db.bankTransaction.findFirst({
      where: { id: transactionId, teamId: team.id },
    })

    if (!transaction) {
      return { error: "Transaksjonen ble ikke funnet." }
    }

    if (transaction.matched) {
      return { error: "Transaksjonen er allerede koblet." }
    }

    await db.$transaction(async (tx) => {
      const absAmount = Math.abs(transaction.amount)

      if (type === "expense") {
        // Look up category for account mapping
        let categoryName: string | null = null
        let categoryAccountCode: string | null = null
        if (categoryId) {
          const category = await tx.category.findUnique({ where: { id: categoryId } })
          categoryName = category?.name ?? null
          categoryAccountCode = category?.accountCode ?? null
        }

        const expense = await tx.expense.create({
          data: {
            description: transaction.description,
            amount: absAmount,
            mvaAmount: 0,
            mvaRate: 0,
            categoryId: categoryId || null,
            date: transaction.date,
            teamId: team.id,
            createdById: user.id,
          },
        })

        await tx.bankTransaction.update({
          where: { id: transactionId },
          data: { matched: true, expenseId: expense.id },
        })

        const expenseAccountCode = resolveExpenseAccountCode(categoryName, categoryAccountCode)
        await createJournalEntry(tx, {
          teamId: team.id,
          date: transaction.date,
          description: `Utgift (bank): ${transaction.description}`,
          lines: [
            { accountCode: expenseAccountCode, debitAmount: absAmount, creditAmount: 0, description: transaction.description },
            { accountCode: "1920", debitAmount: 0, creditAmount: absAmount, description: `Bankutbetaling – ${transaction.description}` },
          ],
          expenseId: expense.id,
        })
      } else {
        const income = await tx.income.create({
          data: {
            description: transaction.description,
            amount: absAmount,
            source: "Bank-import",
            date: transaction.date,
            teamId: team.id,
            createdById: user.id,
          },
        })

        await tx.bankTransaction.update({
          where: { id: transactionId },
          data: { matched: true, incomeId: income.id },
        })

        await createJournalEntry(tx, {
          teamId: team.id,
          date: transaction.date,
          description: `Inntekt (bank): ${transaction.description}`,
          lines: [
            { accountCode: "1920", debitAmount: absAmount, creditAmount: 0, description: `Bankinnbetaling – ${transaction.description}` },
            { accountCode: "3000", debitAmount: 0, creditAmount: absAmount, description: transaction.description },
          ],
          incomeId: income.id,
        })
      }
    })

    revalidatePath("/bank-import")
    return {}
  } catch (e) {
    return { error: `Noe gikk galt: ${e instanceof Error ? e.message : "Vennligst prøv igjen."}` }
  }
}
