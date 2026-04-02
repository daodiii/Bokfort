import { NS4102_DEFAULTS, CATEGORY_ACCOUNT_MAP } from "@/lib/kontoplan"
import { db } from "@/lib/db"

// Prisma interactive transaction client type — inferred from db.$transaction callback
type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0]

export type JournalLineInput = {
  accountCode: string
  debitAmount: number // in øre, 0 if credit-only
  creditAmount: number // in øre, 0 if debit-only
  description?: string
}

export type CreateJournalEntryParams = {
  teamId: string
  date: Date
  description: string
  lines: JournalLineInput[]
  invoiceId?: string
  expenseId?: string
  incomeId?: string
  payrollRunId?: string
  travelExpenseId?: string
}

/**
 * Validate that a set of journal lines balance (sum of debits = sum of credits).
 * Throws if not balanced or if any amount is negative.
 */
export function validateBalance(lines: JournalLineInput[]): void {
  if (lines.length === 0) {
    throw new Error("Bilag må ha minst én linje")
  }

  let totalDebit = 0
  let totalCredit = 0

  for (const line of lines) {
    if (line.debitAmount < 0 || line.creditAmount < 0) {
      throw new Error("Beløp kan ikke være negativt")
    }
    if (line.debitAmount > 0 && line.creditAmount > 0) {
      throw new Error(
        `Konto ${line.accountCode}: en linje kan ikke ha både debet og kredit`
      )
    }
    if (line.debitAmount === 0 && line.creditAmount === 0) {
      throw new Error(`Konto ${line.accountCode}: beløp kan ikke være 0`)
    }
    totalDebit += line.debitAmount
    totalCredit += line.creditAmount
  }

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Bilag balanserer ikke: debet ${totalDebit} øre ≠ kredit ${totalCredit} øre`
    )
  }
}

/**
 * Look up an account by team + NS 4102 code.
 * Throws a descriptive error if not found.
 */
export async function getAccountByCode(
  tx: TxClient,
  teamId: string,
  code: string
) {
  const account = await tx.account.findUnique({
    where: { teamId_code: { teamId, code } },
  })

  if (!account) {
    throw new Error(
      `Konto ${code} finnes ikke for dette teamet. Kjør kontoplanoppsett først.`
    )
  }

  return account
}

/**
 * Atomically get the next voucher number for a team + fiscal year.
 * Must run inside a Prisma $transaction.
 */
export async function getNextVoucherNumber(
  tx: TxClient,
  teamId: string,
  fiscalYear: number
): Promise<number> {
  const team = await tx.team.findUniqueOrThrow({ where: { id: teamId } })

  const seq = (team.voucherNumberSeq as Record<string, number>) ?? {}
  const yearKey = String(fiscalYear)
  const nextNumber = (seq[yearKey] ?? 0) + 1
  seq[yearKey] = nextNumber

  await tx.team.update({
    where: { id: teamId },
    data: { voucherNumberSeq: seq },
  })

  return nextNumber
}

/**
 * Ensure the team's chart of accounts has been seeded.
 * If not yet seeded, creates all NS 4102 default accounts and updates default categories.
 * Safe to call multiple times — no-ops if already seeded.
 */
export async function ensureChartSeeded(
  tx: TxClient,
  teamId: string
): Promise<void> {
  const team = await tx.team.findUniqueOrThrow({ where: { id: teamId } })
  if (team.chartSeeded) return

  // Create all default accounts
  await tx.account.createMany({
    data: NS4102_DEFAULTS.map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      parentCode: a.parentCode,
      teamId,
    })),
    skipDuplicates: true,
  })

  // Update default categories with account codes
  const categories = await tx.category.findMany({
    where: { OR: [{ teamId }, { teamId: null, isDefault: true }] },
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
    where: { id: teamId },
    data: { chartSeeded: true },
  })
}

/**
 * Create a balanced journal entry with lines.
 * Validates balance, resolves account codes, assigns voucher number.
 * Must run inside a Prisma $transaction.
 */
export async function createJournalEntry(
  tx: TxClient,
  params: CreateJournalEntryParams
) {
  // Validate balance before any DB writes
  validateBalance(params.lines)

  // Ensure chart of accounts exists
  await ensureChartSeeded(tx, params.teamId)

  const fiscalYear = params.date.getFullYear()
  const voucherNumber = await getNextVoucherNumber(tx, params.teamId, fiscalYear)

  // Resolve account codes to IDs
  const lineData = await Promise.all(
    params.lines.map(async (line) => {
      const account = await getAccountByCode(tx, params.teamId, line.accountCode)
      return {
        accountId: account.id,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        description: line.description,
      }
    })
  )

  const entry = await tx.journalEntry.create({
    data: {
      voucherNumber,
      fiscalYear,
      date: params.date,
      description: params.description,
      teamId: params.teamId,
      invoiceId: params.invoiceId,
      expenseId: params.expenseId,
      incomeId: params.incomeId,
      payrollRunId: params.payrollRunId,
      travelExpenseId: params.travelExpenseId,
      lines: {
        create: lineData,
      },
    },
    include: { lines: true },
  })

  return entry
}
