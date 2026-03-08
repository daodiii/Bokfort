"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { parseBankCsv } from "@/lib/csv-parser"
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

    if (type === "expense") {
      const expense = await db.expense.create({
        data: {
          description: transaction.description,
          amount: Math.abs(transaction.amount),
          mvaAmount: 0,
          mvaRate: 0,
          categoryId: categoryId || null,
          date: transaction.date,
          teamId: team.id,
          createdById: user.id,
        },
      })

      await db.bankTransaction.update({
        where: { id: transactionId },
        data: {
          matched: true,
          expenseId: expense.id,
        },
      })
    } else {
      const income = await db.income.create({
        data: {
          description: transaction.description,
          amount: Math.abs(transaction.amount),
          source: "Bank-import",
          date: transaction.date,
          teamId: team.id,
          createdById: user.id,
        },
      })

      await db.bankTransaction.update({
        where: { id: transactionId },
        data: {
          matched: true,
          incomeId: income.id,
        },
      })
    }

    revalidatePath("/bank-import")
    return {}
  } catch {
    return { error: "Noe gikk galt. Vennligst prøv igjen." }
  }
}
