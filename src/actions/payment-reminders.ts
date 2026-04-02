"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

export async function getPaymentReminders() {
  const { team } = await getCurrentTeam()

  const reminders = await db.paymentReminder.findMany({
    where: { teamId: team.id },
    include: {
      invoice: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return reminders
}

export async function createReminder(
  invoiceId: string,
  daysAfterDue: number,
  message?: string
): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  // Verify invoice belongs to team and is overdue
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, teamId: team.id },
  })

  if (!invoice) {
    return { error: "Faktura ble ikke funnet." }
  }

  if (invoice.status !== "OVERDUE") {
    return { error: "Fakturaen er ikke forfalt." }
  }

  try {
    await db.paymentReminder.create({
      data: {
        invoiceId,
        teamId: team.id,
        daysAfterDue,
        message: message || null,
      },
    })
  } catch {
    return { error: "Noe gikk galt ved opprettelse av purring. Vennligst prøv igjen." }
  }

  revalidatePath("/faktura/purringer")
  return {}
}

export async function sendReminder(id: string): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  const reminder = await db.paymentReminder.findFirst({
    where: { id, teamId: team.id },
    include: {
      invoice: {
        include: { customer: true },
      },
    },
  })

  if (!reminder) {
    return { error: "Purring ble ikke funnet." }
  }

  if (reminder.status === "SENT") {
    return { error: "Purringen er allerede sendt." }
  }

  try {
    // Simulate sending the reminder (e.g., email to customer)
    // In production, this would integrate with an email service
    await db.paymentReminder.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    })
  } catch {
    return { error: "Noe gikk galt ved sending av purring. Vennligst prøv igjen." }
  }

  revalidatePath("/faktura/purringer")
  return {}
}

export async function getOverdueInvoicesWithoutReminders() {
  const { team } = await getCurrentTeam()

  const overdueInvoices = await db.invoice.findMany({
    where: {
      teamId: team.id,
      status: "OVERDUE",
      reminders: {
        none: {},
      },
    },
    include: {
      customer: true,
    },
    orderBy: { dueDate: "asc" },
  })

  return overdueInvoices
}

export async function createAutoReminders(): Promise<{
  error?: string
  count?: number
}> {
  const { team } = await getCurrentTeam()

  const overdueInvoices = await db.invoice.findMany({
    where: {
      teamId: team.id,
      status: "OVERDUE",
      reminders: {
        none: {},
      },
    },
  })

  if (overdueInvoices.length === 0) {
    return { error: "Ingen forfalte fakturaer uten purring funnet." }
  }

  try {
    const created = await db.paymentReminder.createMany({
      data: overdueInvoices.map((invoice) => ({
        invoiceId: invoice.id,
        teamId: team.id,
        daysAfterDue: 7,
        message: null,
      })),
    })

    revalidatePath("/faktura/purringer")
    return { count: created.count }
  } catch {
    return { error: "Noe gikk galt ved opprettelse av purringer. Vennligst prøv igjen." }
  }
}
