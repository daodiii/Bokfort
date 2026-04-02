"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const recurringLineSchema = z.object({
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  quantity: z.number().int().min(1, "Antall må være minst 1"),
  unitPrice: z.number().int().min(0, "Enhetspris kan ikke være negativ"),
  mvaRate: z.number().int(),
})

const createRecurringInvoiceSchema = z.object({
  customerId: z.string().min(1, "Kunde er påkrevd"),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  nextRunDate: z.string().min(1, "Neste kjøredato er påkrevd"),
  daysDue: z.number().int().min(1, "Forfallsdager må være minst 1"),
  notes: z.string().optional(),
  lines: z.array(recurringLineSchema).min(1, "Minst én linje er påkrevd"),
})

export type RecurringInvoiceFormData = z.infer<typeof createRecurringInvoiceSchema>

export type RecurringInvoiceActionResult = {
  errors?: {
    customerId?: string[]
    frequency?: string[]
    nextRunDate?: string[]
    daysDue?: string[]
    notes?: string[]
    lines?: string[]
    _form?: string[]
  }
  success?: boolean
}

export async function getRecurringInvoices() {
  const { team } = await getCurrentTeam()

  const recurringInvoices = await db.recurringInvoice.findMany({
    where: { teamId: team.id },
    include: {
      customer: true,
      lines: true,
      _count: {
        select: { invoices: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return recurringInvoices
}

export async function createRecurringInvoice(
  data: RecurringInvoiceFormData
): Promise<RecurringInvoiceActionResult> {
  const { team } = await getCurrentTeam()

  const parsed = createRecurringInvoiceSchema.safeParse(data)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as RecurringInvoiceActionResult["errors"],
    }
  }

  const { customerId, frequency, nextRunDate, daysDue, notes, lines } = parsed.data

  // Verify customer belongs to team
  const customer = await db.customer.findFirst({
    where: { id: customerId, teamId: team.id },
  })

  if (!customer) {
    return {
      errors: { _form: ["Kunden ble ikke funnet."] },
    }
  }

  try {
    await db.recurringInvoice.create({
      data: {
        customerId,
        teamId: team.id,
        frequency,
        nextRunDate: new Date(nextRunDate),
        daysDue,
        notes: notes || null,
        lines: {
          create: lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            mvaRate: line.mvaRate,
          })),
        },
      },
    })
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt ved opprettelse. Vennligst prøv igjen."],
      },
    }
  }

  revalidatePath("/faktura/gjentakende")
  redirect("/faktura/gjentakende")
}

export async function updateRecurringInvoice(
  id: string,
  data: RecurringInvoiceFormData
): Promise<RecurringInvoiceActionResult> {
  const { team } = await getCurrentTeam()

  const existing = await db.recurringInvoice.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return {
      errors: { _form: ["Gjentakende faktura ble ikke funnet."] },
    }
  }

  const parsed = createRecurringInvoiceSchema.safeParse(data)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as RecurringInvoiceActionResult["errors"],
    }
  }

  const { customerId, frequency, nextRunDate, daysDue, notes, lines } = parsed.data

  // Verify customer belongs to team
  const customer = await db.customer.findFirst({
    where: { id: customerId, teamId: team.id },
  })

  if (!customer) {
    return {
      errors: { _form: ["Kunden ble ikke funnet."] },
    }
  }

  try {
    await db.$transaction(async (tx) => {
      // Delete existing lines
      await tx.recurringInvoiceLine.deleteMany({
        where: { recurringInvoiceId: id },
      })

      // Update recurring invoice with new lines
      await tx.recurringInvoice.update({
        where: { id },
        data: {
          customerId,
          frequency,
          nextRunDate: new Date(nextRunDate),
          daysDue,
          notes: notes || null,
          lines: {
            create: lines.map((line) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              mvaRate: line.mvaRate,
            })),
          },
        },
      })
    })
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt ved oppdatering. Vennligst prøv igjen."],
      },
    }
  }

  revalidatePath("/faktura/gjentakende")
  redirect("/faktura/gjentakende")
}

export async function toggleRecurringInvoice(
  id: string
): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  const existing = await db.recurringInvoice.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return { error: "Gjentakende faktura ble ikke funnet." }
  }

  try {
    await db.recurringInvoice.update({
      where: { id },
      data: { isActive: !existing.isActive },
    })
  } catch {
    return { error: "Noe gikk galt. Vennligst prøv igjen." }
  }

  revalidatePath("/faktura/gjentakende")
  return {}
}

export async function deleteRecurringInvoice(
  id: string
): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  const existing = await db.recurringInvoice.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return { error: "Gjentakende faktura ble ikke funnet." }
  }

  try {
    await db.recurringInvoice.delete({
      where: { id },
    })
  } catch {
    return { error: "Noe gikk galt ved sletting. Vennligst prøv igjen." }
  }

  revalidatePath("/faktura/gjentakende")
  return {}
}
