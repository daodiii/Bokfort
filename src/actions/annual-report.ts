"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"

// --- Types ---

export type CategoryBreakdown = {
  category: string
  total: number
}

export type MonthlyBreakdown = {
  month: number
  monthName: string
  revenue: number
  expenses: number
  net: number
}

export type IncomeStatement = {
  driftsinntekter: {
    inntekter: CategoryBreakdown[]
    fakturainntekter: number
    totalDriftsinntekter: number
  }
  driftskostnader: {
    kategorier: CategoryBreakdown[]
    totalDriftskostnader: number
  }
  lonnskostnader: {
    bruttolonn: number
    arbeidsgiveravgift: number
    pensjon: number
    totalLonnskostnader: number
  }
  driftsresultat: number
}

export type BalanceSheet = {
  eiendeler: {
    kundefordringer: number
    bank: number
    totalEiendeler: number
  }
}

export type KeyMetrics = {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMarginPercent: number
}

export type YearOverYear = {
  previousYear: number
  previousRevenue: number
  previousExpenses: number
  previousNetProfit: number
  revenueChange: number
  expensesChange: number
  netProfitChange: number
} | null

export type AnnualReport = {
  year: number
  companyName: string
  orgNumber: string | null
  resultatregnskap: IncomeStatement
  balanse: BalanceSheet
  metrics: KeyMetrics
  monthlyBreakdown: MonthlyBreakdown[]
  yearOverYear: YearOverYear
}

// --- Norwegian month names ---

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "Mars",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Desember",
]

// --- Helper: compute annual data for a given year ---

async function computeYearData(teamId: string, year: number) {
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999)

  const [incomes, expenses, invoicesPaid, invoicesUnpaid, payrollRuns] =
    await Promise.all([
      // All income records for the year
      db.income.findMany({
        where: {
          teamId,
          date: { gte: startDate, lte: endDate },
        },
      }),

      // All expenses for the year, with category
      db.expense.findMany({
        where: {
          teamId,
          date: { gte: startDate, lte: endDate },
        },
        include: { category: true },
      }),

      // Paid invoices (revenue from invoices)
      db.invoice.findMany({
        where: {
          teamId,
          status: "PAID",
          issueDate: { gte: startDate, lte: endDate },
        },
      }),

      // Unpaid invoices (accounts receivable) - SENT or OVERDUE
      db.invoice.findMany({
        where: {
          teamId,
          status: { in: ["SENT", "OVERDUE"] },
          issueDate: { gte: startDate, lte: endDate },
        },
      }),

      // Payroll runs for the year
      db.payrollRun.findMany({
        where: {
          teamId,
          period: {
            gte: `${year}-01`,
            lte: `${year}-12`,
          },
          status: { in: ["APPROVED", "PAID"] },
        },
      }),
    ])

  return { incomes, expenses, invoicesPaid, invoicesUnpaid, payrollRuns }
}

// --- Main action ---

export async function getAnnualReport(year: number): Promise<AnnualReport> {
  const { team } = await getCurrentTeam()

  const { incomes, expenses, invoicesPaid, invoicesUnpaid, payrollRuns } =
    await computeYearData(team.id, year)

  // ===== RESULTATREGNSKAP (Income Statement) =====

  // Driftsinntekter: income records (excluding invoice-linked to avoid double-counting)
  // plus paid invoices
  const nonInvoiceIncomes = incomes.filter((i) => !i.invoiceId)
  const incomeBySource = new Map<string, number>()
  for (const income of nonInvoiceIncomes) {
    const key = income.source || income.description || "Annen inntekt"
    incomeBySource.set(key, (incomeBySource.get(key) ?? 0) + income.amount)
  }
  const inntekter: CategoryBreakdown[] = Array.from(incomeBySource.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  const fakturainntekter = invoicesPaid.reduce((sum, inv) => sum + inv.total, 0)
  const totalDriftsinntekter =
    nonInvoiceIncomes.reduce((sum, i) => sum + i.amount, 0) + fakturainntekter

  // Driftskostnader: expenses grouped by category
  const expenseByCategory = new Map<string, number>()
  for (const expense of expenses) {
    const key = expense.category?.name || "Ukategorisert"
    expenseByCategory.set(
      key,
      (expenseByCategory.get(key) ?? 0) + expense.amount
    )
  }
  const kategorier: CategoryBreakdown[] = Array.from(
    expenseByCategory.entries()
  )
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  const totalDriftskostnader = expenses.reduce(
    (sum, e) => sum + e.amount,
    0
  )

  // Lonnskostnader: from payroll runs
  const bruttolonn = payrollRuns.reduce((sum, pr) => sum + pr.totalGross, 0)
  const pensjon = payrollRuns.reduce((sum, pr) => sum + pr.totalPension, 0)
  // Arbeidsgiveravgift (employer's NI) ~14.1% of gross - simplified estimate
  const arbeidsgiveravgift = Math.round(bruttolonn * 0.141)
  const totalLonnskostnader = bruttolonn + arbeidsgiveravgift + pensjon

  const driftsresultat =
    totalDriftsinntekter - totalDriftskostnader - totalLonnskostnader

  const resultatregnskap: IncomeStatement = {
    driftsinntekter: {
      inntekter,
      fakturainntekter,
      totalDriftsinntekter,
    },
    driftskostnader: {
      kategorier,
      totalDriftskostnader,
    },
    lonnskostnader: {
      bruttolonn,
      arbeidsgiveravgift,
      pensjon,
      totalLonnskostnader,
    },
    driftsresultat,
  }

  // ===== BALANSE (Balance Sheet) =====

  const kundefordringer = invoicesUnpaid.reduce(
    (sum, inv) => sum + inv.total,
    0
  )
  // Simplified bank/cash: total income - total expenses
  const bank = totalDriftsinntekter - totalDriftskostnader - totalLonnskostnader

  const balanse: BalanceSheet = {
    eiendeler: {
      kundefordringer,
      bank: Math.max(bank, 0),
      totalEiendeler: kundefordringer + Math.max(bank, 0),
    },
  }

  // ===== KEY METRICS =====

  const totalRevenue = totalDriftsinntekter
  const totalExpenses = totalDriftskostnader + totalLonnskostnader
  const netProfit = totalRevenue - totalExpenses
  const profitMarginPercent =
    totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  const metrics: KeyMetrics = {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMarginPercent,
  }

  // ===== MONTHLY BREAKDOWN =====

  const monthlyBreakdown: MonthlyBreakdown[] = MONTH_NAMES.map(
    (monthName, idx) => {
      const month = idx + 1

      // Monthly income (non-invoice-linked)
      const monthIncome = nonInvoiceIncomes
        .filter((i) => new Date(i.date).getMonth() === idx)
        .reduce((sum, i) => sum + i.amount, 0)

      // Monthly invoice revenue
      const monthInvoice = invoicesPaid
        .filter((inv) => new Date(inv.issueDate).getMonth() === idx)
        .reduce((sum, inv) => sum + inv.total, 0)

      const monthRevenue = monthIncome + monthInvoice

      // Monthly expenses
      const monthExpenses = expenses
        .filter((e) => new Date(e.date).getMonth() === idx)
        .reduce((sum, e) => sum + e.amount, 0)

      // Monthly payroll
      const periodStr = `${year}-${String(month).padStart(2, "0")}`
      const monthPayroll = payrollRuns
        .filter((pr) => pr.period === periodStr)
        .reduce((sum, pr) => sum + pr.totalGross + pr.totalPension, 0)

      const totalMonthExpenses = monthExpenses + monthPayroll

      return {
        month,
        monthName,
        revenue: monthRevenue,
        expenses: totalMonthExpenses,
        net: monthRevenue - totalMonthExpenses,
      }
    }
  )

  // ===== YEAR-OVER-YEAR =====

  let yearOverYear: YearOverYear = null

  try {
    const prevYear = year - 1
    const prevData = await computeYearData(team.id, prevYear)

    const prevNonInvoiceIncomes = prevData.incomes.filter((i) => !i.invoiceId)
    const prevFaktura = prevData.invoicesPaid.reduce(
      (sum, inv) => sum + inv.total,
      0
    )
    const previousRevenue =
      prevNonInvoiceIncomes.reduce((sum, i) => sum + i.amount, 0) + prevFaktura
    const prevExpenseTotal = prevData.expenses.reduce(
      (sum, e) => sum + e.amount,
      0
    )
    const prevPayrollTotal = prevData.payrollRuns.reduce(
      (sum, pr) => sum + pr.totalGross + pr.totalPension,
      0
    )
    const prevAGA = Math.round(
      prevData.payrollRuns.reduce((sum, pr) => sum + pr.totalGross, 0) * 0.141
    )
    const previousExpenses = prevExpenseTotal + prevPayrollTotal + prevAGA
    const previousNetProfit = previousRevenue - previousExpenses

    // Only include YoY if there was any data
    const hasData =
      prevData.incomes.length > 0 ||
      prevData.expenses.length > 0 ||
      prevData.invoicesPaid.length > 0 ||
      prevData.payrollRuns.length > 0

    if (hasData) {
      yearOverYear = {
        previousYear: prevYear,
        previousRevenue,
        previousExpenses,
        previousNetProfit,
        revenueChange:
          previousRevenue > 0
            ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
            : 0,
        expensesChange:
          previousExpenses > 0
            ? ((totalExpenses - previousExpenses) / previousExpenses) * 100
            : 0,
        netProfitChange:
          previousNetProfit !== 0
            ? ((netProfit - previousNetProfit) / Math.abs(previousNetProfit)) *
              100
            : 0,
      }
    }
  } catch {
    // Previous year data not available
  }

  return {
    year,
    companyName: team.companyName || team.name,
    orgNumber: team.orgNumber || null,
    resultatregnskap,
    balanse,
    metrics,
    monthlyBreakdown,
    yearOverYear,
  }
}

// --- Available years ---

export async function getAvailableYears(): Promise<number[]> {
  const { team } = await getCurrentTeam()
  const currentYear = new Date().getFullYear()

  // Check which years have data by looking at incomes, expenses, and invoices
  const [oldestIncome, oldestExpense, oldestInvoice] = await Promise.all([
    db.income.findFirst({
      where: { teamId: team.id },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    db.expense.findFirst({
      where: { teamId: team.id },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    db.invoice.findFirst({
      where: { teamId: team.id },
      orderBy: { issueDate: "asc" },
      select: { issueDate: true },
    }),
  ])

  const dates = [
    oldestIncome?.date,
    oldestExpense?.date,
    oldestInvoice?.issueDate,
  ].filter(Boolean) as Date[]

  if (dates.length === 0) {
    return [currentYear]
  }

  const oldestYear = Math.min(...dates.map((d) => new Date(d).getFullYear()))
  const years: number[] = []
  for (let y = currentYear; y >= oldestYear; y--) {
    years.push(y)
  }

  return years
}
