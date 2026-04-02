/**
 * Maps Prisma invoice + team data to EhfDocumentData.
 * Used by both the server action and the API route.
 */

import { formatXmlDate } from "./xml-utils"
import type {
  EhfDocumentData,
  EhfInvoiceLine,
  EhfTaxSubtotal,
  EhfTaxCategory,
} from "./ehf-types"
import type { MvaRate } from "./mva"

function oreToNok(ore: number): number {
  return ore / 100
}

function mvaRateToTaxCategory(rate: MvaRate): EhfTaxCategory {
  return rate === 0 ? "E" : "S"
}

type InvoiceWithRelations = {
  invoiceNumber: number
  invoiceType: string
  issueDate: Date
  dueDate: Date
  currency: string
  kidNumber: string | null
  subtotal: number
  mvaAmount: number
  total: number
  customer: {
    name: string
    orgNumber: string | null
    address: string | null
    city: string | null
    postalCode: string | null
    email: string | null
  }
  lines: {
    description: string
    quantity: number
    unitPrice: number
    lineTotal: number
    mvaRate: number
    mvaAmount: number
  }[]
  originalInvoice?: { invoiceNumber: number } | null
}

type TeamData = {
  name: string
  companyName: string | null
  orgNumber: string | null
  companyType: string
  mvaRegistered: boolean
  address: string | null
  city: string | null
  postalCode: string | null
  bankAccount: string | null
}

export function mapInvoiceToEhfData(
  invoice: InvoiceWithRelations,
  team: TeamData
): EhfDocumentData {
  const isCredit = invoice.invoiceType === "CREDIT_NOTE"

  const ehfLines: EhfInvoiceLine[] = invoice.lines.map((line, i) => ({
    id: String(i + 1),
    description: line.description,
    quantity: line.quantity,
    unitCode: "EA",
    unitPrice: oreToNok(line.unitPrice),
    lineTotal: oreToNok(line.lineTotal),
    taxCategory: mvaRateToTaxCategory(line.mvaRate as MvaRate),
    taxPercent: line.mvaRate as MvaRate,
    taxExemptionReasonCode: line.mvaRate === 0 ? "vatex-eu-ae" : undefined,
  }))

  // Aggregate tax summary by category + rate
  const taxMap = new Map<string, {
    category: EhfTaxCategory
    percent: MvaRate
    taxableAmount: number
    taxAmount: number
  }>()
  for (const line of invoice.lines) {
    const category = mvaRateToTaxCategory(line.mvaRate as MvaRate)
    const key = `${category}-${line.mvaRate}`
    const existing = taxMap.get(key)
    if (existing) {
      existing.taxableAmount += line.lineTotal
      existing.taxAmount += line.mvaAmount
    } else {
      taxMap.set(key, {
        category,
        percent: line.mvaRate as MvaRate,
        taxableAmount: line.lineTotal,
        taxAmount: line.mvaAmount,
      })
    }
  }

  const taxSummary: EhfTaxSubtotal[] = Array.from(taxMap.values()).map((t) => ({
    category: t.category,
    percent: t.percent,
    taxableAmount: oreToNok(t.taxableAmount),
    taxAmount: oreToNok(t.taxAmount),
    taxExemptionReasonCode: t.percent === 0 ? "vatex-eu-ae" : undefined,
  }))

  return {
    type: isCredit ? "creditNote" : "invoice",
    invoiceTypeCode: isCredit ? "381" : "380",
    invoiceNumber: String(invoice.invoiceNumber),
    issueDate: formatXmlDate(invoice.issueDate),
    dueDate: formatXmlDate(invoice.dueDate),
    currency: invoice.currency,
    originalInvoiceRef: isCredit && invoice.originalInvoice
      ? String(invoice.originalInvoice.invoiceNumber)
      : undefined,
    seller: {
      name: team.companyName || team.name,
      orgNumber: team.orgNumber!,
      vatNumber: team.mvaRegistered ? `NO${team.orgNumber}MVA` : undefined,
      companyType: team.companyType as "ENK" | "AS",
      registeredInForetaksregisteret: team.companyType === "AS",
      address: {
        street: team.address ?? undefined,
        city: team.city ?? undefined,
        postalCode: team.postalCode ?? undefined,
        country: "NO",
      },
      bankAccount: team.bankAccount ?? undefined,
    },
    buyer: {
      name: invoice.customer.name,
      orgNumber: invoice.customer.orgNumber ?? undefined,
      address: {
        street: invoice.customer.address ?? undefined,
        city: invoice.customer.city ?? undefined,
        postalCode: invoice.customer.postalCode ?? undefined,
        country: "NO",
      },
      email: invoice.customer.email ?? undefined,
    },
    paymentMeans: team.bankAccount
      ? {
          code: "30",
          paymentId: invoice.kidNumber ?? undefined,
          accountId: team.bankAccount,
        }
      : undefined,
    lines: ehfLines,
    taxSummary,
    totals: {
      lineExtensionAmount: oreToNok(invoice.subtotal),
      taxExclusiveAmount: oreToNok(invoice.subtotal),
      taxInclusiveAmount: oreToNok(invoice.total),
      payableAmount: oreToNok(invoice.total),
    },
  }
}
