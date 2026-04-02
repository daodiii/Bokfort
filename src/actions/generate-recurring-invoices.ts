"use server"

import { db } from "@/lib/db"
import { generateKID } from "@/lib/kid"
import { addDays, addWeeks, addMonths, addYears } from "date-fns"
import type { RecurringFrequency } from "@/generated/prisma/client"

/**
 * Calculate the next run date based on frequency.
 */
function calculateNextRunDate(
  current: Date,
  frequency: RecurringFrequency
): Date {
  switch (frequency) {
    case "WEEKLY":
      return addWeeks(current, 1)
    case "BIWEEKLY":
      return addWeeks(current, 2)
    case "MONTHLY":
      return addMonths(current, 1)
    case "QUARTERLY":
      return addMonths(current, 3)
    case "YEARLY":
      return addYears(current, 1)
  }
}

type GenerationResult = {
  generated: number
  errors: string[]
}

/**
 * Generate invoices from all due recurring templates for a given team.
 * Called from the API cron route or manually from the UI.
 */
export async function generateRecurringInvoices(
  teamId: string
): Promise<GenerationResult> {
  const now = new Date()
  const results: GenerationResult = { generated: 0, errors: [] }

  // Find all active recurring invoices that are due
  const dueTemplates = await db.recurringInvoice.findMany({
    where: {
      teamId,
      isActive: true,
      nextRunDate: { lte: now },
    },
    include: {
      lines: true,
      customer: true,
    },
  })

  for (const template of dueTemplates) {
    try {
      await db.$transaction(async (tx) => {
        // Get and increment invoice number
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: { invoiceNumberSeq: { increment: 1 } },
        })

        const invoiceNumber = updatedTeam.invoiceNumberSeq - 1
        const kidNumber = generateKID(invoiceNumber)

        // Calculate line totals
        let subtotal = 0
        let totalMva = 0

        const calculatedLines = template.lines.map((line) => {
          const lineTotal = line.quantity * line.unitPrice
          const mvaAmount = Math.round((lineTotal * line.mvaRate) / 100)
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

        const total = subtotal + totalMva
        const issueDate = template.nextRunDate
        const dueDate = addDays(issueDate, template.daysDue)

        // Find a user on the team to set as creator
        const membership = await tx.membership.findFirst({
          where: { teamId },
          select: { userId: true },
        })

        if (!membership) {
          throw new Error("Ingen teammedlemmer funnet")
        }

        // Create the invoice
        await tx.invoice.create({
          data: {
            invoiceNumber,
            kidNumber,
            customerId: template.customerId,
            teamId,
            createdById: membership.userId,
            issueDate,
            dueDate,
            notes: template.notes,
            subtotal,
            mvaAmount: totalMva,
            total,
            recurringInvoiceId: template.id,
            lines: {
              create: calculatedLines,
            },
          },
        })

        // Update the recurring template: advance nextRunDate, set lastRunDate
        const nextRun = calculateNextRunDate(
          template.nextRunDate,
          template.frequency
        )

        await tx.recurringInvoice.update({
          where: { id: template.id },
          data: {
            nextRunDate: nextRun,
            lastRunDate: now,
          },
        })
      })

      results.generated++
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ukjent feil"
      results.errors.push(
        `Feil ved generering for kunde ${template.customer.name}: ${message}`
      )
    }
  }

  return results
}

/**
 * Manually trigger generation for the current user's team.
 */
export async function triggerRecurringGeneration(): Promise<GenerationResult> {
  // Import here to avoid circular dependency
  const { getCurrentTeam } = await import("@/lib/auth-utils")
  const { team } = await getCurrentTeam()
  return generateRecurringInvoices(team.id)
}
