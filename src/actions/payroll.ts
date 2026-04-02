"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { createJournalEntry } from "@/lib/accounting"
import { revalidatePath } from "next/cache"

export async function getPayrollRuns() {
  const { team } = await getCurrentTeam()

  return db.payrollRun.findMany({
    where: { teamId: team.id },
    include: {
      entries: { include: { employee: true } },
      approvedBy: true,
    },
    orderBy: { period: "desc" },
  })
}

export async function getPayrollRun(id: string) {
  const { team } = await getCurrentTeam()

  return db.payrollRun.findFirst({
    where: { id, teamId: team.id },
    include: {
      entries: {
        include: { employee: true },
        orderBy: { employee: { name: "asc" } },
      },
      approvedBy: true,
    },
  })
}

export async function createPayrollRun(
  period: string
): Promise<{ error?: string; id?: string }> {
  const { team } = await getCurrentTeam()

  // Check if a payroll run already exists for this period
  const existing = await db.payrollRun.findFirst({
    where: { teamId: team.id, period },
  })

  if (existing) {
    return { error: `Det finnes allerede en lønnskjøring for perioden ${period}.` }
  }

  // Get all active employees
  const employees = await db.employee.findMany({
    where: { teamId: team.id, isActive: true },
  })

  if (employees.length === 0) {
    return { error: "Ingen aktive ansatte funnet. Legg til ansatte først." }
  }

  // Calculate payroll entries
  const entries = employees.map((emp) => {
    const grossAmount = emp.monthlySalary
    const taxAmount = Math.round(grossAmount * (emp.taxPercent / 100))
    const pensionAmount = Math.round(grossAmount * (emp.pensionPercent / 100))
    const netAmount = grossAmount - taxAmount

    return {
      employeeId: emp.id,
      grossAmount,
      taxAmount,
      pensionAmount,
      netAmount,
    }
  })

  const totalGross = entries.reduce((s, e) => s + e.grossAmount, 0)
  const totalTax = entries.reduce((s, e) => s + e.taxAmount, 0)
  const totalNet = entries.reduce((s, e) => s + e.netAmount, 0)
  const totalPension = entries.reduce((s, e) => s + e.pensionAmount, 0)

  try {
    const payrollRun = await db.payrollRun.create({
      data: {
        period,
        teamId: team.id,
        totalGross,
        totalTax,
        totalNet,
        totalPension,
        entries: {
          create: entries,
        },
      },
    })

    revalidatePath("/lonn")
    return { id: payrollRun.id }
  } catch {
    return {
      error: "Noe gikk galt ved opprettelse av lønnskjøring. Vennligst prøv igjen.",
    }
  }
}

export async function approvePayrollRun(
  id: string
): Promise<{ error?: string }> {
  const { team, user } = await getCurrentTeam()

  const run = await db.payrollRun.findFirst({
    where: { id, teamId: team.id },
  })

  if (!run) {
    return { error: "Lønnskjøring ble ikke funnet." }
  }

  if (run.status !== "DRAFT") {
    return { error: "Kun utkast kan godkjennes." }
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.payrollRun.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: user.id,
          approvedAt: new Date(),
        },
      })

      // Journal entry for payroll
      const arbeidsgiveravgift = Math.round(run.totalGross * 0.141)

      await createJournalEntry(tx, {
        teamId: team.id,
        date: new Date(),
        description: `Lønnskjøring ${run.period}`,
        lines: [
          {
            accountCode: "5000",
            debitAmount: run.totalGross,
            creditAmount: 0,
            description: `Bruttolønn ${run.period}`,
          },
          {
            accountCode: "5400",
            debitAmount: arbeidsgiveravgift,
            creditAmount: 0,
            description: `Arbeidsgiveravgift ${run.period}`,
          },
          {
            accountCode: "5800",
            debitAmount: run.totalPension,
            creditAmount: 0,
            description: `Pensjonskostnad ${run.period}`,
          },
          {
            accountCode: "1920",
            debitAmount: 0,
            creditAmount: run.totalNet,
            description: `Nettolønnsutbetaling ${run.period}`,
          },
          {
            accountCode: "2600",
            debitAmount: 0,
            creditAmount: run.totalTax,
            description: `Skattetrekk ${run.period}`,
          },
          {
            accountCode: "2770",
            debitAmount: 0,
            creditAmount: run.totalPension,
            description: `Skyldig pensjon ${run.period}`,
          },
          {
            accountCode: "2780",
            debitAmount: 0,
            creditAmount: arbeidsgiveravgift,
            description: `Skyldig arbeidsgiveravgift ${run.period}`,
          },
        ],
        payrollRunId: id,
      })
    })
  } catch (e) {
    return {
      error: `Noe gikk galt ved godkjenning: ${e instanceof Error ? e.message : "Vennligst prøv igjen."}`,
    }
  }

  revalidatePath("/lonn")
  revalidatePath(`/lonn/${id}`)
  return {}
}

export async function markPayrollPaid(
  id: string
): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  const run = await db.payrollRun.findFirst({
    where: { id, teamId: team.id },
  })

  if (!run) {
    return { error: "Lønnskjøring ble ikke funnet." }
  }

  if (run.status !== "APPROVED") {
    return { error: "Kun godkjente lønnskjøringer kan markeres som betalt." }
  }

  try {
    await db.payrollRun.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    })
  } catch {
    return {
      error: "Noe gikk galt ved markering som betalt. Vennligst prøv igjen.",
    }
  }

  revalidatePath("/lonn")
  revalidatePath(`/lonn/${id}`)
  return {}
}

export async function deletePayrollRun(
  id: string
): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  const run = await db.payrollRun.findFirst({
    where: { id, teamId: team.id },
  })

  if (!run) {
    return { error: "Lønnskjøring ble ikke funnet." }
  }

  if (run.status !== "DRAFT") {
    return { error: "Kun utkast kan slettes." }
  }

  try {
    await db.payrollRun.delete({
      where: { id },
    })
  } catch {
    return {
      error: "Noe gikk galt ved sletting. Vennligst prøv igjen.",
    }
  }

  revalidatePath("/lonn")
  return {}
}
