/**
 * Type definitions for EHF 3.0 (PEPPOL BIS Billing 3.0 / UBL 2.1) documents.
 */

import type { MvaRate } from "./mva"

export type EhfTaxCategory = "S" | "E" | "Z"

export type EhfPartyAddress = {
  street?: string
  city?: string
  postalCode?: string
  country: string
}

export type EhfSeller = {
  name: string
  orgNumber: string
  vatNumber?: string
  companyType: "ENK" | "AS"
  registeredInForetaksregisteret: boolean
  address: EhfPartyAddress
  bankAccount?: string
  bic?: string
}

export type EhfBuyer = {
  name: string
  orgNumber?: string
  address: EhfPartyAddress
  email?: string
}

export type EhfPaymentMeans = {
  code: string
  paymentId?: string
  accountId?: string
  bic?: string
}

export type EhfInvoiceLine = {
  id: string
  description: string
  quantity: number
  unitCode: string
  unitPrice: number
  lineTotal: number
  taxCategory: EhfTaxCategory
  taxPercent: MvaRate
  taxExemptionReasonCode?: string
}

export type EhfTaxSubtotal = {
  category: EhfTaxCategory
  percent: MvaRate
  taxableAmount: number
  taxAmount: number
  taxExemptionReasonCode?: string
}

export type EhfTotals = {
  lineExtensionAmount: number
  taxExclusiveAmount: number
  taxInclusiveAmount: number
  payableAmount: number
}

export type EhfDocumentData = {
  type: "invoice" | "creditNote"
  invoiceTypeCode: string
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  currency: string
  buyerReference?: string
  orderReference?: string
  paymentTermsNote?: string
  originalInvoiceRef?: string
  seller: EhfSeller
  buyer: EhfBuyer
  paymentMeans?: EhfPaymentMeans
  lines: EhfInvoiceLine[]
  taxSummary: EhfTaxSubtotal[]
  totals: EhfTotals
}

export type EhfValidationError = {
  field: string
  message: string
  rule?: string
}

export type EhfValidationResult = {
  valid: boolean
  errors: EhfValidationError[]
  warnings: EhfValidationError[]
}
