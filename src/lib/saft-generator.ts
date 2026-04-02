/**
 * SAF-T Financial v1.30 XML Generator for Norwegian accounting.
 *
 * Generates XML conforming to the Skatteetaten SAF-T Financial Schema v1.30.
 * Namespace: urn:StandardAuditFile-Taxation-Financial:NO
 *
 * Reference: https://github.com/Skatteetaten/saf-t
 */

import {
  OUTPUT_TAX_CODES,
  INPUT_TAX_CODES,
  getGroupingCategory,
  formatSaftDate,
  oreToSaftAmount,
} from "./saft-codes"
import { escapeXml } from "./xml-utils"

// ===== Types =====

type SaftTeam = {
  name: string
  companyName?: string | null
  orgNumber?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  mvaRegistered: boolean
  bankAccount?: string | null
}

type SaftAccount = {
  code: string
  name: string
  type: string // AccountType enum
  openingDebit: number // øre
  openingCredit: number // øre
  closingDebit: number // øre
  closingCredit: number // øre
}

type SaftCustomer = {
  id: string
  name: string
  orgNumber?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  email?: string | null
  phone?: string | null
}

type SaftJournalLine = {
  recordId: number
  accountCode: string
  debitAmount: number // øre
  creditAmount: number // øre
  description: string
  customerId?: string | null
  taxCode?: string
  taxPercentage?: number
  taxBase?: number // øre
  taxAmount?: number // øre
}

type SaftTransaction = {
  transactionId: string
  voucherNumber: number
  date: Date
  description: string
  systemEntryDate: Date
  period: number // 1-12
  periodYear: number
  lines: SaftJournalLine[]
  sourceId?: string
}

type SaftJournal = {
  journalId: string
  description: string
  type: string
  transactions: SaftTransaction[]
}

export type SaftExportData = {
  team: SaftTeam
  startDate: Date
  endDate: Date
  accounts: SaftAccount[]
  customers: SaftCustomer[]
  journals: SaftJournal[]
}

// ===== XML Helpers =====

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) : str
}

// ===== XML Builder Helpers =====

function el(tag: string, content: string, indent: number = 0): string {
  const pad = "  ".repeat(indent)
  return `${pad}<n1:${tag}>${escapeXml(content)}</n1:${tag}>\n`
}

function elRaw(tag: string, content: string, indent: number = 0): string {
  const pad = "  ".repeat(indent)
  return `${pad}<n1:${tag}>\n${content}${pad}</n1:${tag}>\n`
}

// ===== Generator =====

export function generateSaftXml(data: SaftExportData): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<n1:AuditFile xmlns:n1="urn:StandardAuditFile-Taxation-Financial:NO" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:StandardAuditFile-Taxation-Financial:NO Norwegian_SAF-T_Financial_Schema_v_1.30.xsd">\n`

  xml += generateHeader(data)
  xml += generateMasterFiles(data)
  xml += generateGeneralLedgerEntries(data)

  xml += `</n1:AuditFile>\n`
  return xml
}

function generateHeader(data: SaftExportData): string {
  const { team } = data
  const now = new Date()

  let header = ""
  header += el("AuditFileVersion", "1.30", 2)
  header += el("AuditFileCountry", "NO", 2)
  header += el("AuditFileDateCreated", formatSaftDate(now), 2)
  header += el("SoftwareCompanyName", "Bokført AS", 2)
  header += el("SoftwareID", "Bokført", 2)
  header += el("SoftwareVersion", "1.0.0", 2)

  // Company
  let company = ""
  company += el("RegistrationNumber", team.orgNumber ?? "000000000", 3)
  company += el("Name", truncate(team.companyName ?? team.name, 2000), 3)

  if (team.address || team.city || team.postalCode) {
    let addr = ""
    addr += el("StreetName", truncate(team.address ?? "", 100), 4)
    addr += el("City", truncate(team.city ?? "", 60), 4)
    addr += el("PostalCode", truncate(team.postalCode ?? "", 60), 4)
    addr += el("Country", "NO", 4)
    company += elRaw("Address", addr, 3)
  }

  if (team.bankAccount) {
    let bank = ""
    bank += el("IBANNumber", team.bankAccount, 4)
    company += elRaw("BankAccount", bank, 3)
  }

  if (team.mvaRegistered && team.orgNumber) {
    let tax = ""
    tax += el("TaxRegistrationNumber", team.orgNumber + "MVA", 4)
    tax += el("TaxAuthority", "Skatteetaten", 4)
    company += elRaw("TaxRegistration", tax, 3)
  }

  header += elRaw("Company", company, 2)

  header += el("DefaultCurrencyCode", "NOK", 2)

  // SelectionCriteria — mandatory in v1.30
  let criteria = ""
  criteria += el("SelectionStartDate", formatSaftDate(data.startDate), 3)
  criteria += el("SelectionEndDate", formatSaftDate(data.endDate), 3)
  header += elRaw("SelectionCriteria", criteria, 2)

  header += el("TaxAccountingBasis", "A", 2)

  return elRaw("Header", header, 1)
}

function generateMasterFiles(data: SaftExportData): string {
  let master = ""

  // GeneralLedgerAccounts
  let accounts = ""
  for (const acct of data.accounts) {
    let account = ""
    account += el("AccountID", acct.code, 4)
    account += el("AccountDescription", truncate(acct.name, 2000), 4)

    // v1.30: GroupingCategory + GroupingCode replace StandardAccountID
    const grouping = getGroupingCategory(acct.code)
    account += el("GroupingCategory", grouping.category, 4)
    account += el("GroupingCode", grouping.code, 4)

    account += el("AccountType", "GL", 4)

    // Opening balances
    if (acct.openingDebit > 0) {
      account += el("OpeningDebitBalance", oreToSaftAmount(acct.openingDebit), 4)
    } else {
      account += el("OpeningCreditBalance", oreToSaftAmount(acct.openingCredit), 4)
    }

    // Closing balances
    if (acct.closingDebit > 0) {
      account += el("ClosingDebitBalance", oreToSaftAmount(acct.closingDebit), 4)
    } else {
      account += el("ClosingCreditBalance", oreToSaftAmount(acct.closingCredit), 4)
    }

    accounts += elRaw("Account", account, 3)
  }
  master += elRaw("GeneralLedgerAccounts", accounts, 2)

  // Customers
  if (data.customers.length > 0) {
    let customers = ""
    for (const cust of data.customers) {
      let customer = ""
      customer += el("RegistrationNumber", cust.orgNumber ?? "", 4)
      customer += el("Name", truncate(cust.name, 2000), 4)

      if (cust.address || cust.city || cust.postalCode) {
        let addr = ""
        addr += el("StreetName", truncate(cust.address ?? "", 100), 5)
        addr += el("City", truncate(cust.city ?? "", 60), 5)
        addr += el("PostalCode", truncate(cust.postalCode ?? "", 60), 5)
        addr += el("Country", "NO", 5)
        customer += elRaw("Address", addr, 4)
      }

      if (cust.email || cust.phone) {
        let contact = ""
        if (cust.phone) contact += el("Telephone", cust.phone, 5)
        if (cust.email) contact += el("Email", cust.email, 5)
        customer += elRaw("Contact", contact, 4)
      }

      customer += el("CustomerID", cust.id, 4)
      customers += elRaw("Customer", customer, 3)
    }
    master += elRaw("Customers", customers, 2)
  }

  // TaxTable
  if (data.team.mvaRegistered) {
    let taxTable = ""
    let entry = ""
    entry += el("TaxType", "MVA", 4)
    entry += el("Description", "Merverdiavgift", 4)

    // Output tax codes (sales)
    for (const [rate, info] of Object.entries(OUTPUT_TAX_CODES)) {
      let detail = ""
      detail += el("TaxCode", `O${rate}`, 5)
      detail += el("Description", info.description, 5)
      detail += el("TaxPercentage", String(rate), 5)
      detail += el("Country", "NO", 5)
      detail += el("StandardTaxCode", info.standardTaxCode, 5)
      detail += el("BaseRate", String(rate), 5)
      entry += elRaw("TaxCodeDetails", detail, 4)
    }

    // Input tax codes (purchases)
    for (const [rate, info] of Object.entries(INPUT_TAX_CODES)) {
      let detail = ""
      detail += el("TaxCode", `I${rate}`, 5)
      detail += el("Description", info.description, 5)
      detail += el("TaxPercentage", String(rate), 5)
      detail += el("Country", "NO", 5)
      detail += el("StandardTaxCode", info.standardTaxCode, 5)
      detail += el("BaseRate", String(rate), 5)
      entry += elRaw("TaxCodeDetails", detail, 4)
    }

    taxTable += elRaw("TaxTableEntry", entry, 3)
    master += elRaw("TaxTable", taxTable, 2)
  }

  return elRaw("MasterFiles", master, 1)
}

function generateGeneralLedgerEntries(data: SaftExportData): string {
  // Count all transactions and sum debits/credits
  let totalTransactions = 0
  let totalDebit = 0
  let totalCredit = 0

  for (const journal of data.journals) {
    totalTransactions += journal.transactions.length
    for (const tx of journal.transactions) {
      for (const line of tx.lines) {
        totalDebit += line.debitAmount
        totalCredit += line.creditAmount
      }
    }
  }

  let entries = ""
  entries += el("NumberOfEntries", String(totalTransactions), 2)
  entries += el("TotalDebit", oreToSaftAmount(totalDebit), 2)
  entries += el("TotalCredit", oreToSaftAmount(totalCredit), 2)

  for (const journal of data.journals) {
    let journalXml = ""
    journalXml += el("JournalID", journal.journalId, 3)
    journalXml += el("Description", truncate(journal.description, 2000), 3)
    journalXml += el("Type", truncate(journal.type, 100), 3)

    for (const tx of journal.transactions) {
      let transaction = ""
      transaction += el("TransactionID", tx.transactionId, 4)
      transaction += el("Period", String(tx.period), 4)
      transaction += el("PeriodYear", String(tx.periodYear), 4)
      transaction += el("TransactionDate", formatSaftDate(tx.date), 4)

      if (tx.sourceId) {
        transaction += el("SourceID", truncate(tx.sourceId, 60), 4)
      }

      transaction += el("Description", truncate(tx.description, 2000), 4)
      transaction += el("SystemEntryDate", formatSaftDate(tx.systemEntryDate), 4)
      transaction += el("GLPostingDate", formatSaftDate(tx.date), 4)

      // Lines
      for (const line of tx.lines) {
        let lineXml = ""
        lineXml += el("RecordID", String(line.recordId), 5)
        lineXml += el("AccountID", line.accountCode, 5)

        if (line.customerId) {
          lineXml += el("CustomerID", line.customerId, 5)
        }

        lineXml += el("Description", truncate(line.description, 2000), 5)

        // DebitAmount OR CreditAmount (choice)
        if (line.debitAmount > 0) {
          let amount = ""
          amount += el("Amount", oreToSaftAmount(line.debitAmount), 6)
          lineXml += elRaw("DebitAmount", amount, 5)
        } else {
          let amount = ""
          amount += el("Amount", oreToSaftAmount(line.creditAmount), 6)
          lineXml += elRaw("CreditAmount", amount, 5)
        }

        // TaxInformation (if applicable)
        if (line.taxCode && line.taxAmount && line.taxAmount > 0) {
          let taxInfo = ""
          taxInfo += el("TaxType", "MVA", 6)
          taxInfo += el("TaxCode", line.taxCode, 6)
          taxInfo += el("TaxPercentage", String(line.taxPercentage ?? 0), 6)

          if (line.taxBase) {
            let taxBase = ""
            taxBase += el("Amount", oreToSaftAmount(line.taxBase), 7)
            taxInfo += elRaw("TaxBase", taxBase, 6)
          }

          let taxAmt = ""
          taxAmt += el("Amount", oreToSaftAmount(line.taxAmount), 7)
          taxInfo += elRaw("TaxAmount", taxAmt, 6)

          lineXml += elRaw("TaxInformation", taxInfo, 5)
        }

        transaction += elRaw("Line", lineXml, 4)
      }

      journalXml += elRaw("Transaction", transaction, 3)
    }

    entries += elRaw("Journal", journalXml, 2)
  }

  return elRaw("GeneralLedgerEntries", entries, 1)
}
