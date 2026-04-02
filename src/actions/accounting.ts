"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { NS4102_DEFAULTS, CATEGORY_ACCOUNT_MAP } from "@/lib/kontoplan"
type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"

// ===== CHART OF ACCOUNTS =====

export async function seedChartOfAccounts() {
  const { team } = await getCurrentTeam()

  if (team.chartSeeded) {
    return { error: "Kontoplan er allerede opprettet" }
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.account.createMany({
        data: NS4102_DEFAULTS.map((a) => ({
          code: a.code,
          name: a.name,
          type: a.type,
          parentCode: a.parentCode,
          teamId: team.id,
        })),
        skipDuplicates: true,
      })

      // Map default categories to account codes
      const categories = await tx.category.findMany({
        where: { OR: [{ teamId: team.id }, { teamId: null, isDefault: true }] },
      })

      for (const cat of categories) {
        const normalized = cat.name.toLowerCase().trim()
        const accountCode = CATEGORY_ACCOUNT_MAP[normalized]
        if (accountCode && !cat.accountCode) {
          await tx.category.update({
            where: { id: cat.id },
            data: { accountCode },
          })
        }
      }

      await tx.team.update({
        where: { id: team.id },
        data: { chartSeeded: true },
      })
    })

    revalidatePath("/regnskap")
    return { success: true }
  } catch (e) {
    return { error: `Kunne ikke opprette kontoplan: ${e instanceof Error ? e.message : "Ukjent feil"}` }
  }
}

export async function getAccounts() {
  const { team } = await getCurrentTeam()

  return db.account.findMany({
    where: { teamId: team.id },
    orderBy: { code: "asc" },
  })
}

const createAccountSchema = z.object({
  code: z.string().min(4, "Kontonummer må ha minst 4 siffer").max(4, "Kontonummer kan ha maks 4 siffer").regex(/^\d+$/, "Kontonummer må kun inneholde tall"),
  name: z.string().min(1, "Kontonavn er påkrevd"),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
})

export async function createAccount(data: { code: string; name: string; type: AccountType }) {
  const { team } = await getCurrentTeam()

  const parsed = createAccountSchema.safeParse(data)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const existing = await db.account.findUnique({
    where: { teamId_code: { teamId: team.id, code: parsed.data.code } },
  })
  if (existing) {
    return { errors: { code: ["Kontonummer er allerede i bruk"] } }
  }

  // Derive parentCode from first 2 digits
  const parentCode = parsed.data.code.substring(0, 2)

  try {
    await db.account.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        type: parsed.data.type,
        parentCode,
        teamId: team.id,
      },
    })

    revalidatePath("/regnskap/kontoplan")
    return { success: true }
  } catch (e) {
    return { errors: { _form: [`Kunne ikke opprette konto: ${e instanceof Error ? e.message : "Ukjent feil"}`] } }
  }
}

export async function updateAccount(id: string, data: { name?: string; isActive?: boolean }) {
  const { team } = await getCurrentTeam()

  const account = await db.account.findFirst({
    where: { id, teamId: team.id },
  })
  if (!account) {
    return { error: "Konto ikke funnet" }
  }

  await db.account.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })

  revalidatePath("/regnskap/kontoplan")
  return { success: true }
}

// ===== JOURNAL ENTRIES =====

export async function getJournalEntries(params: {
  fiscalYear?: number
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) {
  const { team } = await getCurrentTeam()

  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50

  const where: Record<string, unknown> = { teamId: team.id }

  if (params.fiscalYear) {
    where.fiscalYear = params.fiscalYear
  }

  if (params.startDate || params.endDate) {
    where.date = {
      ...(params.startDate && { gte: new Date(params.startDate) }),
      ...(params.endDate && { lte: new Date(params.endDate) }),
    }
  }

  const [entries, total] = await Promise.all([
    db.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: { account: true },
        },
      },
      orderBy: [{ fiscalYear: "desc" }, { voucherNumber: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.journalEntry.count({ where }),
  ])

  return { entries, total, page, pageSize }
}

export async function getJournalEntry(id: string) {
  const { team } = await getCurrentTeam()

  return db.journalEntry.findFirst({
    where: { id, teamId: team.id },
    include: {
      lines: {
        include: { account: true },
      },
      invoice: { select: { id: true, invoiceNumber: true } },
      expense: { select: { id: true, description: true } },
      income: { select: { id: true, description: true } },
      payrollRun: { select: { id: true, period: true } },
      travelExpense: { select: { id: true, description: true } },
    },
  })
}

// ===== ACCOUNT LEDGER =====

export async function getAccountLedger(accountCode: string, params: {
  startDate?: string
  endDate?: string
}) {
  const { team } = await getCurrentTeam()

  const account = await db.account.findUnique({
    where: { teamId_code: { teamId: team.id, code: accountCode } },
  })
  if (!account) {
    return { error: "Konto ikke funnet" }
  }

  const dateFilter: Record<string, Date> = {}
  if (params.startDate) dateFilter.gte = new Date(params.startDate)
  if (params.endDate) dateFilter.lte = new Date(params.endDate)

  const lines = await db.journalLine.findMany({
    where: {
      accountId: account.id,
      journalEntry: {
        teamId: team.id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
    },
    include: {
      journalEntry: {
        select: {
          id: true,
          voucherNumber: true,
          fiscalYear: true,
          date: true,
          description: true,
        },
      },
    },
    orderBy: { journalEntry: { date: "asc" } },
  })

  // Calculate running balance
  let runningBalance = 0
  const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE"

  const linesWithBalance = lines.map((line) => {
    if (isDebitNormal) {
      runningBalance += line.debitAmount - line.creditAmount
    } else {
      runningBalance += line.creditAmount - line.debitAmount
    }
    return { ...line, runningBalance }
  })

  return {
    account,
    lines: linesWithBalance,
    closingBalance: runningBalance,
  }
}

// ===== TRIAL BALANCE (SALDOBALANSE) =====

export type TrialBalanceRow = {
  accountCode: string
  accountName: string
  accountType: AccountType
  totalDebit: number
  totalCredit: number
  balance: number // positive = debit balance for assets/expenses, credit balance for liabilities/equity/revenue
}

export async function getTrialBalance(params: {
  asOfDate?: string
  fiscalYear?: number
}) {
  const { team } = await getCurrentTeam()

  const fiscalYear = params.fiscalYear ?? new Date().getFullYear()

  const dateFilter: Record<string, unknown> = {}
  if (params.asOfDate) {
    dateFilter.lte = new Date(params.asOfDate)
  }

  // Aggregate all journal lines by account for the given fiscal year
  const accounts = await db.account.findMany({
    where: { teamId: team.id, isActive: true },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            teamId: team.id,
            fiscalYear,
            ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
          },
        },
      },
    },
    orderBy: { code: "asc" },
  })

  const rows: TrialBalanceRow[] = []

  for (const account of accounts) {
    let totalDebit = 0
    let totalCredit = 0

    for (const line of account.journalLines) {
      totalDebit += line.debitAmount
      totalCredit += line.creditAmount
    }

    // Skip accounts with no activity
    if (totalDebit === 0 && totalCredit === 0) continue

    const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE"
    const balance = isDebitNormal
      ? totalDebit - totalCredit
      : totalCredit - totalDebit

    rows.push({
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      totalDebit,
      totalCredit,
      balance,
    })
  }

  return rows
}
