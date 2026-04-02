"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { kronerToOre } from "@/lib/utils"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { TravelExpenseStatus } from "@/generated/prisma/client"

const travelExpenseItemSchema = z.object({
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  amount: z.number().positive("Beløp må være større enn 0"),
  mvaRate: z.number().int().min(0),
  category: z.enum(["Transport", "Overnatting", "Diett", "Annet"], {
    message: "Velg en gyldig kategori",
  }),
  date: z.string().min(1, "Dato er påkrevd"),
})

const createTravelExpenseSchema = z.object({
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  destination: z.string().optional(),
  departDate: z.string().min(1, "Avreisedato er påkrevd"),
  returnDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(travelExpenseItemSchema).min(1, "Minst én utgiftspost er påkrevd"),
  status: z.enum(["DRAFT", "SUBMITTED"]).default("DRAFT"),
})

export type TravelExpenseFormData = z.infer<typeof createTravelExpenseSchema>

export type TravelExpenseActionResult = {
  errors?: {
    description?: string[]
    destination?: string[]
    departDate?: string[]
    returnDate?: string[]
    items?: string[]
    _form?: string[]
  }
  success?: boolean
}

export async function getTravelExpenses() {
  const { team } = await getCurrentTeam()

  const expenses = await db.travelExpense.findMany({
    where: { teamId: team.id },
    include: {
      items: true,
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Compute stats
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const thisYearExpenses = expenses.filter(
    (e) => new Date(e.createdAt) >= startOfYear
  )
  const totalThisYear = thisYearExpenses.reduce(
    (sum, e) => sum + e.totalAmount,
    0
  )
  const pendingApproval = expenses.filter(
    (e) => e.status === "SUBMITTED"
  ).length
  const reimbursedTotal = expenses
    .filter((e) => e.status === "REIMBURSED")
    .reduce((sum, e) => sum + e.totalAmount, 0)
  const avgPerTrip =
    thisYearExpenses.length > 0
      ? Math.round(totalThisYear / thisYearExpenses.length)
      : 0

  return {
    expenses,
    stats: {
      totalThisYear,
      pendingApproval,
      reimbursedTotal,
      avgPerTrip,
    },
  }
}

export async function createTravelExpense(
  data: TravelExpenseFormData
): Promise<TravelExpenseActionResult> {
  const parsed = createTravelExpenseSchema.safeParse(data)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten()
        .fieldErrors as TravelExpenseActionResult["errors"],
    }
  }

  const { description, destination, departDate, returnDate, notes, items, status } =
    parsed.data

  let expenseId: string

  try {
    const { team, user } = await getCurrentTeam()

    // Calculate totals from items
    let totalAmount = 0
    let totalMva = 0

    const itemsData = items.map((item) => {
      const amountOre = kronerToOre(item.amount)
      const mvaAmountOre = Math.round(amountOre * item.mvaRate / 100)
      totalAmount += amountOre
      totalMva += mvaAmountOre
      return {
        description: item.description,
        amount: amountOre,
        mvaAmount: mvaAmountOre,
        mvaRate: item.mvaRate,
        category: item.category,
        date: new Date(item.date),
      }
    })

    const result = await db.travelExpense.create({
      data: {
        description,
        destination: destination || null,
        departDate: new Date(departDate),
        returnDate: returnDate ? new Date(returnDate) : null,
        totalAmount,
        mvaAmount: totalMva,
        status: status as TravelExpenseStatus,
        teamId: team.id,
        createdById: user.id,
        items: {
          create: itemsData,
        },
      },
    })

    expenseId = result.id
  } catch {
    return {
      errors: {
        _form: [
          "Noe gikk galt ved opprettelse av reiseregningen. Vennligst prøv igjen.",
        ],
      },
    }
  }

  revalidatePath("/reiseregning")
  redirect(`/reiseregning/${expenseId}`)
}

export async function updateTravelExpenseStatus(
  id: string,
  status: TravelExpenseStatus
): Promise<{ error?: string }> {
  const { team, user } = await getCurrentTeam()

  const existing = await db.travelExpense.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return { error: "Reiseregningen ble ikke funnet." }
  }

  // Validate status transitions
  const validTransitions: Record<TravelExpenseStatus, TravelExpenseStatus[]> = {
    DRAFT: ["SUBMITTED"],
    SUBMITTED: ["APPROVED", "REJECTED"],
    APPROVED: ["REIMBURSED"],
    REJECTED: ["DRAFT"],
    REIMBURSED: [],
  }

  if (!validTransitions[existing.status]?.includes(status)) {
    return {
      error: `Kan ikke endre status fra ${existing.status} til ${status}.`,
    }
  }

  try {
    const updateData: Record<string, unknown> = { status }

    // Track approval metadata
    if (status === "APPROVED" || status === "REJECTED") {
      updateData.approvedById = user.id
      updateData.approvedAt = new Date()
    }

    await db.travelExpense.update({
      where: { id },
      data: updateData,
    })
  } catch {
    return {
      error: "Noe gikk galt ved oppdatering av status. Vennligst prøv igjen.",
    }
  }

  revalidatePath("/reiseregning")
  revalidatePath(`/reiseregning/${id}`)
  return {}
}

export async function deleteTravelExpense(
  id: string
): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  const existing = await db.travelExpense.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return { error: "Reiseregningen ble ikke funnet." }
  }

  if (existing.status !== "DRAFT") {
    return { error: "Kun utkast kan slettes." }
  }

  try {
    await db.travelExpense.delete({
      where: { id },
    })
  } catch {
    return {
      error:
        "Noe gikk galt ved sletting av reiseregningen. Vennligst prøv igjen.",
    }
  }

  revalidatePath("/reiseregning")
  redirect("/reiseregning")
}
