"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { generateMvaMeldingXml, type MvaMeldingData } from "@/lib/mva-melding"
import { generateAMeldingXml, type AMeldingData, type AMeldingEmployee, type AMeldingPayrollEntry } from "@/lib/a-melding"
import { decrypt } from "@/lib/crypto"

// --- MVA-melding ---

export async function exportMvaMelding(
  termin: number, // 1-6 (bi-monthly periods)
  year: number
): Promise<{ xml?: string; filename?: string; error?: string }> {
  const { team } = await getCurrentTeam()

  if (!team.orgNumber) {
    return { error: "Organisasjonsnummer mangler i innstillinger." }
  }

  if (!team.mvaRegistered) {
    return { error: "Virksomheten er ikke MVA-registrert." }
  }

  // Calculate period dates from termin
  const startMonth = (termin - 1) * 2 + 1 // 1,3,5,7,9,11
  const endMonth = startMonth + 1
  const startDate = new Date(year, startMonth - 1, 1)
  const endDate = new Date(year, endMonth, 0) // Last day of end month

  // Get outgoing MVA from invoices
  const invoices = await db.invoice.findMany({
    where: {
      teamId: team.id,
      status: { in: ["SENT", "PAID"] },
      issueDate: { gte: startDate, lte: endDate },
    },
    include: { lines: true },
  })

  const outgoingMap = new Map<number, { base: number; mva: number }>()
  for (const invoice of invoices) {
    for (const line of invoice.lines) {
      const existing = outgoingMap.get(line.mvaRate) ?? { base: 0, mva: 0 }
      existing.base += line.lineTotal
      existing.mva += line.mvaAmount
      outgoingMap.set(line.mvaRate, existing)
    }
  }

  // Get incoming MVA from expenses
  const expenses = await db.expense.findMany({
    where: {
      teamId: team.id,
      date: { gte: startDate, lte: endDate },
    },
  })

  const incomingMap = new Map<number, { base: number; mva: number }>()
  for (const expense of expenses) {
    if (expense.mvaRate === 0) continue
    const existing = incomingMap.get(expense.mvaRate) ?? { base: 0, mva: 0 }
    existing.base += expense.amount - expense.mvaAmount
    existing.mva += expense.mvaAmount
    incomingMap.set(expense.mvaRate, existing)
  }

  const outgoing = Array.from(outgoingMap.entries())
    .map(([rate, { base, mva }]) => ({ rate, base, mva }))
    .sort((a, b) => b.rate - a.rate)

  const incoming = Array.from(incomingMap.entries())
    .map(([rate, { base, mva }]) => ({ rate, base, mva }))
    .sort((a, b) => b.rate - a.rate)

  const totalOutgoing = outgoing.reduce((sum, o) => sum + o.mva, 0)
  const totalIncoming = incoming.reduce((sum, i) => sum + i.mva, 0)

  const mvaData: MvaMeldingData = {
    orgNumber: team.orgNumber,
    companyName: team.companyName || team.name,
    periodStart: startDate,
    periodEnd: endDate,
    meldingsKategori: "alminnelig",
    outgoing,
    incoming,
    totalOutgoing,
    totalIncoming,
    netMva: totalOutgoing - totalIncoming,
  }

  const xml = generateMvaMeldingXml(mvaData)
  const orgNr = team.orgNumber.replace(/\s/g, "")
  const filename = `MVA-melding_${orgNr}_${year}-T${termin}.xml`

  return { xml, filename }
}

// --- A-melding ---

export async function exportAMelding(
  period: string // "YYYY-MM"
): Promise<{ xml?: string; filename?: string; error?: string }> {
  const { team } = await getCurrentTeam()

  if (!team.orgNumber) {
    return { error: "Organisasjonsnummer mangler i innstillinger." }
  }

  // Get payroll run for the period
  const payrollRun = await db.payrollRun.findFirst({
    where: { teamId: team.id, period },
    include: {
      entries: {
        include: { employee: true },
      },
    },
  })

  if (!payrollRun) {
    return { error: `Ingen lønnskjøring funnet for perioden ${period}.` }
  }

  if (payrollRun.status === "DRAFT") {
    return { error: "Lønnskjøringen må være godkjent før A-melding kan genereres." }
  }

  // Get all active employees for the team
  const employees = await db.employee.findMany({
    where: { teamId: team.id },
  })

  const ameldingEmployees: AMeldingEmployee[] = employees.map((emp) => ({
    name: emp.name,
    personnummer: emp.personnummer ? decrypt(emp.personnummer) : null,
    startDate: emp.startDate,
    endDate: emp.endDate,
    position: emp.position,
  }))

  const payrollEntries: AMeldingPayrollEntry[] = payrollRun.entries.map(
    (entry) => ({
      employeeName: entry.employee.name,
      personnummer: entry.employee.personnummer
        ? decrypt(entry.employee.personnummer)
        : null,
      grossAmount: entry.grossAmount,
      taxAmount: entry.taxAmount,
      pensionAmount: entry.pensionAmount,
      netAmount: entry.netAmount,
    })
  )

  const ameldingData: AMeldingData = {
    orgNumber: team.orgNumber,
    companyName: team.companyName || team.name,
    companyType: (team.companyType as "ENK" | "AS") ?? "AS",
    period,
    employees: ameldingEmployees,
    payrollEntries,
    totalGross: payrollRun.totalGross,
    totalTax: payrollRun.totalTax,
    totalPension: payrollRun.totalPension,
    totalNet: payrollRun.totalNet,
    arbeidsgiveravgiftSone: "1", // Sone 1 (14.1%) — most common
    arbeidsgiveravgiftRate: 0.141,
  }

  const xml = generateAMeldingXml(ameldingData)
  const orgNr = team.orgNumber.replace(/\s/g, "")
  const filename = `A-melding_${orgNr}_${period}.xml`

  return { xml, filename }
}

// --- Available periods ---

export async function getAvailablePayrollPeriods(): Promise<string[]> {
  const { team } = await getCurrentTeam()

  const runs = await db.payrollRun.findMany({
    where: {
      teamId: team.id,
      status: { in: ["APPROVED", "PAID"] },
    },
    select: { period: true },
    orderBy: { period: "desc" },
  })

  return runs.map((r) => r.period)
}
