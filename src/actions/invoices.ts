"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const invoiceLineSchema = z.object({
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  quantity: z.number().int().min(1, "Antall må være minst 1"),
  unitPrice: z.number().int().min(0, "Enhetspris kan ikke være negativ"),
  mvaRate: z.number().int(),
})

const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Kunde er påkrevd"),
  issueDate: z.string().min(1, "Dato er påkrevd"),
  dueDate: z.string().min(1, "Forfallsdato er påkrevd"),
  notes: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1, "Minst én linje er påkrevd"),
})

export type InvoiceFormData = z.infer<typeof createInvoiceSchema>

export type InvoiceActionResult = {
  errors?: {
    customerId?: string[]
    issueDate?: string[]
    dueDate?: string[]
    notes?: string[]
    lines?: string[]
    _form?: string[]
  }
  success?: boolean
}

function calculateLineTotals(lines: { description: string; quantity: number; unitPrice: number; mvaRate: number }[]) {
  let subtotal = 0
  let totalMva = 0

  const calculatedLines = lines.map((line) => {
    const lineTotal = line.quantity * line.unitPrice
    const mvaAmount = Math.round(lineTotal * line.mvaRate / 100)
    subtotal += lineTotal
    totalMva += mvaAmount
    return {
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      mvaRate: line.mvaRate,
      lineTotal,
      mvaAmount,
    }
  })

  return {
    lines: calculatedLines,
    subtotal,
    mvaAmount: totalMva,
    total: subtotal + totalMva,
  }
}

export async function createInvoice(
  data: InvoiceFormData
): Promise<InvoiceActionResult> {
  const { user, team } = await getCurrentTeam()

  const parsed = createInvoiceSchema.safeParse(data)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as InvoiceActionResult["errors"],
    }
  }

  const { customerId, issueDate, dueDate, notes, lines } = parsed.data

  // Verify customer belongs to team
  const customer = await db.customer.findFirst({
    where: { id: customerId, teamId: team.id },
  })

  if (!customer) {
    return {
      errors: { _form: ["Kunden ble ikke funnet."] },
    }
  }

  const { lines: calculatedLines, subtotal, mvaAmount, total } = calculateLineTotals(lines)

  let invoiceId: string

  try {
    const result = await db.$transaction(async (tx) => {
      // Get and increment invoice number
      const updatedTeam = await tx.team.update({
        where: { id: team.id },
        data: { invoiceNumberSeq: { increment: 1 } },
      })

      const invoiceNumber = updatedTeam.invoiceNumberSeq - 1

      // Create invoice with lines
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          teamId: team.id,
          createdById: user.id,
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          notes: notes || null,
          subtotal,
          mvaAmount,
          total,
          lines: {
            create: calculatedLines,
          },
        },
      })

      return invoice
    })

    invoiceId = result.id
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt ved opprettelse av fakturaen. Vennligst prøv igjen."],
      },
    }
  }

  revalidatePath("/faktura")
  redirect(`/faktura/${invoiceId}`)
}

export async function updateInvoice(
  id: string,
  data: InvoiceFormData
): Promise<InvoiceActionResult> {
  const { team } = await getCurrentTeam()

  // Verify invoice belongs to team and is DRAFT
  const existing = await db.invoice.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return {
      errors: { _form: ["Fakturaen ble ikke funnet."] },
    }
  }

  if (existing.status !== "DRAFT") {
    return {
      errors: { _form: ["Kun utkast-fakturaer kan redigeres."] },
    }
  }

  const parsed = createInvoiceSchema.safeParse(data)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as InvoiceActionResult["errors"],
    }
  }

  const { customerId, issueDate, dueDate, notes, lines } = parsed.data

  // Verify customer belongs to team
  const customer = await db.customer.findFirst({
    where: { id: customerId, teamId: team.id },
  })

  if (!customer) {
    return {
      errors: { _form: ["Kunden ble ikke funnet."] },
    }
  }

  const { lines: calculatedLines, subtotal, mvaAmount, total } = calculateLineTotals(lines)

  try {
    await db.$transaction(async (tx) => {
      // Delete existing lines
      await tx.invoiceLine.deleteMany({
        where: { invoiceId: id },
      })

      // Update invoice with new lines
      await tx.invoice.update({
        where: { id },
        data: {
          customerId,
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          notes: notes || null,
          subtotal,
          mvaAmount,
          total,
          lines: {
            create: calculatedLines,
          },
        },
      })
    })
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt ved oppdatering av fakturaen. Vennligst prøv igjen."],
      },
    }
  }

  revalidatePath("/faktura")
  revalidatePath(`/faktura/${id}`)
  redirect(`/faktura/${id}`)
}

export async function deleteInvoice(id: string): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  const existing = await db.invoice.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return { error: "Fakturaen ble ikke funnet." }
  }

  if (existing.status !== "DRAFT") {
    return { error: "Kun utkast-fakturaer kan slettes." }
  }

  try {
    await db.invoice.delete({
      where: { id },
    })
  } catch {
    return { error: "Noe gikk galt ved sletting av fakturaen. Vennligst prøv igjen." }
  }

  revalidatePath("/faktura")
  redirect("/faktura")
}

export async function updateInvoiceStatus(
  id: string,
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE"
): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  const existing = await db.invoice.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return { error: "Fakturaen ble ikke funnet." }
  }

  try {
    await db.invoice.update({
      where: { id },
      data: { status },
    })
  } catch {
    return { error: "Noe gikk galt ved oppdatering av status. Vennligst prøv igjen." }
  }

  revalidatePath("/faktura")
  revalidatePath(`/faktura/${id}`)
  return {}
}

export async function markAsPaid(id: string): Promise<{ error?: string }> {
  const { user, team } = await getCurrentTeam()

  const existing = await db.invoice.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return { error: "Fakturaen ble ikke funnet." }
  }

  try {
    await db.$transaction(async (tx) => {
      // Update invoice status
      await tx.invoice.update({
        where: { id },
        data: { status: "PAID" },
      })

      // Create income entry linked to invoice
      await tx.income.create({
        data: {
          description: `Faktura #${existing.invoiceNumber}`,
          amount: existing.total,
          source: "Faktura",
          date: new Date(),
          invoiceId: id,
          teamId: team.id,
          createdById: user.id,
        },
      })
    })
  } catch {
    return { error: "Noe gikk galt ved markering som betalt. Vennligst prøv igjen." }
  }

  revalidatePath("/faktura")
  revalidatePath(`/faktura/${id}`)
  revalidatePath("/dashboard")
  return {}
}
