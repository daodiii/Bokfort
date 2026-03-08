"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { kronerToOre } from "@/lib/utils"
import { extractNet, calculateMva, type MvaRate } from "@/lib/mva"
import { revalidatePath } from "next/cache"

const expenseSchema = z.object({
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  amount: z
    .number({ invalid_type_error: "Beløp må være et tall" })
    .positive("Beløp må være større enn 0"),
  mvaRate: z.union([z.literal(0), z.literal(12), z.literal(15), z.literal(25)], {
    message: "Velg en gyldig MVA-sats",
  }),
  categoryId: z.string().min(1, "Velg en kategori").nullable(),
  date: z.string().min(1, "Dato er påkrevd"),
  receiptUrl: z.string().url("Ugyldig URL for kvittering").optional().or(z.literal("")),
})

export type ExpenseState = {
  errors?: {
    description?: string[]
    amount?: string[]
    mvaRate?: string[]
    categoryId?: string[]
    date?: string[]
    receiptUrl?: string[]
    _form?: string[]
  }
  success?: boolean
}

export async function createExpense(
  _prevState: ExpenseState,
  formData: FormData
): Promise<ExpenseState> {
  const rawData = {
    description: formData.get("description"),
    amount: Number(formData.get("amount")),
    mvaRate: Number(formData.get("mvaRate")),
    categoryId: formData.get("categoryId") || null,
    date: formData.get("date"),
    receiptUrl: formData.get("receiptUrl") || "",
  }

  const parsed = expenseSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as ExpenseState["errors"],
    }
  }

  const { description, amount, mvaRate, categoryId, date, receiptUrl } =
    parsed.data

  try {
    const { team, user } = await getCurrentTeam()

    const grossOre = kronerToOre(amount)
    const netOre = extractNet(grossOre, mvaRate as MvaRate)
    const mvaAmountOre = calculateMva(netOre, mvaRate as MvaRate)

    await db.expense.create({
      data: {
        description,
        amount: grossOre,
        mvaAmount: mvaAmountOre,
        mvaRate,
        categoryId: categoryId || null,
        date: new Date(date),
        receiptUrl: receiptUrl || null,
        teamId: team.id,
        createdById: user.id,
      },
    })

    revalidatePath("/utgifter")
    return { success: true }
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt. Vennligst prøv igjen."],
      },
    }
  }
}

export async function updateExpense(
  id: string,
  _prevState: ExpenseState,
  formData: FormData
): Promise<ExpenseState> {
  const rawData = {
    description: formData.get("description"),
    amount: Number(formData.get("amount")),
    mvaRate: Number(formData.get("mvaRate")),
    categoryId: formData.get("categoryId") || null,
    date: formData.get("date"),
    receiptUrl: formData.get("receiptUrl") || "",
  }

  const parsed = expenseSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as ExpenseState["errors"],
    }
  }

  const { description, amount, mvaRate, categoryId, date, receiptUrl } =
    parsed.data

  try {
    const { team } = await getCurrentTeam()

    // Verify team ownership
    const existing = await db.expense.findFirst({
      where: { id, teamId: team.id },
    })

    if (!existing) {
      return {
        errors: {
          _form: ["Utgiften ble ikke funnet eller du har ikke tilgang."],
        },
      }
    }

    const grossOre = kronerToOre(amount)
    const netOre = extractNet(grossOre, mvaRate as MvaRate)
    const mvaAmountOre = calculateMva(netOre, mvaRate as MvaRate)

    await db.expense.update({
      where: { id },
      data: {
        description,
        amount: grossOre,
        mvaAmount: mvaAmountOre,
        mvaRate,
        categoryId: categoryId || null,
        date: new Date(date),
        receiptUrl: receiptUrl || null,
      },
    })

    revalidatePath("/utgifter")
    return { success: true }
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt. Vennligst prøv igjen."],
      },
    }
  }
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  try {
    const { team } = await getCurrentTeam()

    // Verify team ownership
    const existing = await db.expense.findFirst({
      where: { id, teamId: team.id },
    })

    if (!existing) {
      return { error: "Utgiften ble ikke funnet eller du har ikke tilgang." }
    }

    await db.expense.delete({
      where: { id },
    })

    revalidatePath("/utgifter")
    return {}
  } catch {
    return { error: "Noe gikk galt. Vennligst prøv igjen." }
  }
}
