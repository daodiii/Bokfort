"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { generateSaftXml, type SaftExportData } from "@/lib/saft-generator"

export async function exportSaftXml(params: {
  fiscalYear: number
}): Promise<{ xml?: string; filename?: string; error?: string }> {
  const { team } = await getCurrentTeam()

  if (!team.chartSeeded) {
    return { error: "Kontoplan må opprettes før SAF-T kan eksporteres." }
  }

  const { fiscalYear } = params
  const startDate = new Date(fiscalYear, 0, 1) // Jan 1
  const endDate = new Date(fiscalYear, 11, 31) // Dec 31

  try {
    // Fetch all data in parallel
    const [accounts, customers, journalEntries] = await Promise.all([
      db.account.findMany({
        where: { teamId: team.id, isActive: true },
        orderBy: { code: "asc" },
      }),
      db.customer.findMany({
        where: { teamId: team.id },
        orderBy: { name: "asc" },
      }),
      db.journalEntry.findMany({
        where: {
          teamId: team.id,
          fiscalYear,
        },
        include: {
          lines: {
            include: { account: true },
          },
        },
        orderBy: [{ voucherNumber: "asc" }],
      }),
    ])

    // Calculate opening and closing balances per account
    // Opening balance = sum of all prior year entries
    const priorEntries = await db.journalLine.findMany({
      where: {
        journalEntry: {
          teamId: team.id,
          date: { lt: startDate },
        },
      },
      select: {
        accountId: true,
        debitAmount: true,
        creditAmount: true,
      },
    })

    const openingBalances = new Map<string, { debit: number; credit: number }>()
    for (const line of priorEntries) {
      const existing = openingBalances.get(line.accountId) ?? { debit: 0, credit: 0 }
      existing.debit += line.debitAmount
      existing.credit += line.creditAmount
      openingBalances.set(line.accountId, existing)
    }

    // Closing balance = opening + current year
    const currentYearTotals = new Map<string, { debit: number; credit: number }>()
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        const existing = currentYearTotals.get(line.accountId) ?? { debit: 0, credit: 0 }
        existing.debit += line.debitAmount
        existing.credit += line.creditAmount
        currentYearTotals.set(line.accountId, existing)
      }
    }

    // Build account data with balances
    const saftAccounts = accounts.map((acct) => {
      const opening = openingBalances.get(acct.id) ?? { debit: 0, credit: 0 }
      const current = currentYearTotals.get(acct.id) ?? { debit: 0, credit: 0 }

      const isDebitNormal = acct.type === "ASSET" || acct.type === "EXPENSE"
      const openingBalance = isDebitNormal
        ? opening.debit - opening.credit
        : opening.credit - opening.debit
      const closingBalance = openingBalance + (isDebitNormal
        ? current.debit - current.credit
        : current.credit - current.debit)

      return {
        code: acct.code,
        name: acct.name,
        type: acct.type,
        openingDebit: openingBalance > 0 ? openingBalance : 0,
        openingCredit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        closingDebit: closingBalance > 0 ? closingBalance : 0,
        closingCredit: closingBalance < 0 ? Math.abs(closingBalance) : 0,
      }
    })

    // Build journal with transactions
    const saftTransactions = journalEntries.map((entry) => ({
      transactionId: `${entry.fiscalYear}-${entry.voucherNumber}`,
      voucherNumber: entry.voucherNumber,
      date: entry.date,
      description: entry.description,
      systemEntryDate: entry.createdAt,
      period: entry.date.getMonth() + 1,
      periodYear: entry.date.getFullYear(),
      lines: entry.lines.map((line, idx) => ({
        recordId: idx + 1,
        accountCode: line.account.code,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        description: line.description ?? entry.description,
      })),
    }))

    const exportData: SaftExportData = {
      team: {
        name: team.name,
        companyName: team.companyName,
        orgNumber: team.orgNumber,
        address: team.address,
        city: team.city,
        postalCode: team.postalCode,
        mvaRegistered: team.mvaRegistered,
        bankAccount: team.bankAccount,
      },
      startDate,
      endDate,
      accounts: saftAccounts,
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        orgNumber: c.orgNumber,
        address: c.address,
        city: c.city,
        postalCode: c.postalCode,
        email: c.email,
        phone: c.phone,
      })),
      journals: [
        {
          journalId: "GL",
          description: "Hovedbok",
          type: "GL",
          transactions: saftTransactions,
        },
      ],
    }

    const xml = generateSaftXml(exportData)

    // File naming convention: SAF-T Financial_<orgNumber>_<timestamp>.xml
    const orgNum = team.orgNumber ?? "000000000"
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)
    const filename = `SAF-T Financial_${orgNum}_${timestamp}.xml`

    return { xml, filename }
  } catch (e) {
    return {
      error: `Kunne ikke generere SAF-T fil: ${e instanceof Error ? e.message : "Ukjent feil"}`,
    }
  }
}
