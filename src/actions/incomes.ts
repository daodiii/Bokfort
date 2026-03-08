"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { kronerToOre } from "@/lib/utils"
import { revalidatePath } from "next/cache"

const incomeSchema = z.object({
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  amount: z
    .number({ error: "Beløp må være et tall" })
    .positive("Beløp må være større enn 0"),
  source: z.string().optional().or(z.literal("")),
  date: z.string().min(1, "Dato er påkrevd"),
})

export type IncomeState = {
  errors?: {
    description?: string[]
    amount?: string[]
    source?: string[]
    date?: string[]
    _form?: string[]
  }
  success?: boolean
}

export async function createIncome(
  _prevState: IncomeState,
  formData: FormData
): Promise<IncomeState> {
  const rawData = {
    description: formData.get("description"),
    amount: Number(formData.get("amount")),
    source: formData.get("source") || "",
    date: formData.get("date"),
  }

  const parsed = incomeSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as IncomeState["errors"],
    }
  }

  const { description, amount, source, date } = parsed.data

  try {
    const { team, user } = await getCurrentTeam()

    const amountOre = kronerToOre(amount)

    await db.income.create({
      data: {
        description,
        amount: amountOre,
        source: source || null,
        date: new Date(date),
        teamId: team.id,
        createdById: user.id,
      },
    })

    revalidatePath("/inntekter")
    return { success: true }
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt. Vennligst prøv igjen."],
      },
    }
  }
}

export async function updateIncome(
  id: string,
  _prevState: IncomeState,
  formData: FormData
): Promise<IncomeState> {
  const rawData = {
    description: formData.get("description"),
    amount: Number(formData.get("amount")),
    source: formData.get("source") || "",
    date: formData.get("date"),
  }

  const parsed = incomeSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as IncomeState["errors"],
    }
  }

  const { description, amount, source, date } = parsed.data

  try {
    const { team } = await getCurrentTeam()

    // Verify team ownership
    const existing = await db.income.findFirst({
      where: { id, teamId: team.id },
    })

    if (!existing) {
      return {
        errors: {
          _form: ["Inntekten ble ikke funnet eller du har ikke tilgang."],
        },
      }
    }

    // Do not allow editing income linked to an invoice
    if (existing.invoiceId) {
      return {
        errors: {
          _form: [
            "Denne inntekten er knyttet til en faktura og kan ikke endres.",
          ],
        },
      }
    }

    const amountOre = kronerToOre(amount)

    await db.income.update({
      where: { id },
      data: {
        description,
        amount: amountOre,
        source: source || null,
        date: new Date(date),
      },
    })

    revalidatePath("/inntekter")
    return { success: true }
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt. Vennligst prøv igjen."],
      },
    }
  }
}

export async function deleteIncome(id: string): Promise<{ error?: string }> {
  try {
    const { team } = await getCurrentTeam()

    // Verify team ownership
    const existing = await db.income.findFirst({
      where: { id, teamId: team.id },
    })

    if (!existing) {
      return { error: "Inntekten ble ikke funnet eller du har ikke tilgang." }
    }

    // Do not allow deleting income linked to an invoice
    if (existing.invoiceId) {
      return {
        error:
          "Denne inntekten er knyttet til en faktura og kan ikke slettes.",
      }
    }

    await db.income.delete({
      where: { id },
    })

    revalidatePath("/inntekter")
    return {}
  } catch {
    return { error: "Noe gikk galt. Vennligst prøv igjen." }
  }
}
