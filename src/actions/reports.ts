"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"

export async function getProfitAndLoss(startDate: Date, endDate: Date) {
  const { team } = await getCurrentTeam()

  const [incomes, expenses] = await Promise.all([
    db.income.findMany({
      where: {
        teamId: team.id,
        date: { gte: startDate, lte: endDate },
      },
    }),
    db.expense.findMany({
      where: {
        teamId: team.id,
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    }),
  ])

  // Group incomes by source/description
  const incomeMap = new Map<string, number>()
  for (const income of incomes) {
    const key = income.source || income.description || "Annet"
    incomeMap.set(key, (incomeMap.get(key) ?? 0) + income.amount)
  }

  const incomesByCategory = Array.from(incomeMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  // Group expenses by category
  const expenseMap = new Map<string, number>()
  for (const expense of expenses) {
    const key = expense.category?.name || "Ukategorisert"
    expenseMap.set(key, (expenseMap.get(key) ?? 0) + expense.amount)
  }

  const expensesByCategory = Array.from(expenseMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return {
    incomes: incomesByCategory,
    expenses: expensesByCategory,
    totalIncome,
    totalExpenses,
    profit: totalIncome - totalExpenses,
  }
}

export async function getMvaReport(startDate: Date, endDate: Date) {
  const { team } = await getCurrentTeam()

  const [invoices, expenses] = await Promise.all([
    // Outgoing MVA: from invoices (SENT or PAID)
    db.invoice.findMany({
      where: {
        teamId: team.id,
        status: { in: ["SENT", "PAID"] },
        issueDate: { gte: startDate, lte: endDate },
      },
      include: { lines: true },
    }),
    // Incoming MVA: from expenses
    db.expense.findMany({
      where: {
        teamId: team.id,
        date: { gte: startDate, lte: endDate },
      },
    }),
  ])

  // Group outgoing MVA by rate from invoice lines
  const outgoingMap = new Map<number, { base: number; mva: number }>()
  for (const invoice of invoices) {
    for (const line of invoice.lines) {
      const existing = outgoingMap.get(line.mvaRate) ?? { base: 0, mva: 0 }
      existing.base += line.lineTotal
      existing.mva += line.mvaAmount
      outgoingMap.set(line.mvaRate, existing)
    }
  }

  const outgoing = Array.from(outgoingMap.entries())
    .map(([rate, { base, mva }]) => ({ rate, base, mva }))
    .sort((a, b) => b.rate - a.rate)

  // Group incoming MVA by rate from expenses
  const incomingMap = new Map<number, { base: number; mva: number }>()
  for (const expense of expenses) {
    const existing = incomingMap.get(expense.mvaRate) ?? { base: 0, mva: 0 }
    // expense.amount is gross (incl MVA), so base = amount - mvaAmount
    existing.base += expense.amount - expense.mvaAmount
    existing.mva += expense.mvaAmount
    incomingMap.set(expense.mvaRate, existing)
  }

  const incoming = Array.from(incomingMap.entries())
    .map(([rate, { base, mva }]) => ({ rate, base, mva }))
    .sort((a, b) => b.rate - a.rate)

  const totalOutgoing = outgoing.reduce((sum, o) => sum + o.mva, 0)
  const totalIncoming = incoming.reduce((sum, i) => sum + i.mva, 0)

  return {
    outgoing,
    incoming,
    totalOutgoing,
    totalIncoming,
    netMva: totalOutgoing - totalIncoming,
  }
}

export async function exportReportCsv(
  data: Record<string, string | number>[],
  headers: string[]
) {
  const keys = Object.keys(data[0] ?? {})

  // Header row
  const headerRow = headers.join(";")

  // Data rows with Norwegian number formatting
  const rows = data.map((row) =>
    keys
      .map((key) => {
        const value = row[key]
        if (typeof value === "number") {
          // Norwegian formatting: comma as decimal separator
          return value.toFixed(2).replace(".", ",")
        }
        // Escape semicolons and quotes in text
        const str = String(value ?? "")
        if (str.includes(";") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(";")
  )

  return [headerRow, ...rows].join("\n")
}
