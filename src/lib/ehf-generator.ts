/**
 * EHF 3.0 (PEPPOL BIS Billing 3.0 / UBL 2.1) XML generator.
 *
 * Generates Invoice and CreditNote XML conforming to:
 * - UBL 2.1 schema
 * - EN 16931 European standard
 * - PEPPOL BIS Billing 3.0 business rules
 * - Norwegian EHF national rules (Foretaksregisteret, NO-MVA)
 */

import { escapeXml } from "./xml-utils"
import type {
  EhfDocumentData,
  EhfSeller,
  EhfBuyer,
  EhfPaymentMeans,
  EhfInvoiceLine,
  EhfTaxSubtotal,
  EhfTotals,
  EhfPartyAddress,
} from "./ehf-types"

// ===== Constants =====

const CUSTOMIZATION_ID =
  "urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0"
const PROFILE_ID =
  "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0"

const NS_INVOICE = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
const NS_CREDIT_NOTE = "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
const NS_CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
const NS_CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"

// ===== XML Element Helpers =====

function cbc(tag: string, value: string, indent: number): string {
  return `${"  ".repeat(indent)}<cbc:${tag}>${escapeXml(value)}</cbc:${tag}>\n`
}

function cbcAttr(tag: string, value: string, attrs: string, indent: number): string {
  return `${"  ".repeat(indent)}<cbc:${tag} ${attrs}>${escapeXml(value)}</cbc:${tag}>\n`
}

function cacOpen(tag: string, indent: number): string {
  return `${"  ".repeat(indent)}<cac:${tag}>\n`
}

function cacClose(tag: string, indent: number): string {
  return `${"  ".repeat(indent)}</cac:${tag}>\n`
}

function amount(tag: string, value: number, currency: string, indent: number): string {
  return cbcAttr(tag, value.toFixed(2), `currencyID="${currency}"`, indent)
}

// ===== Party Builders =====

function buildAddress(addr: EhfPartyAddress, indent: number): string {
  let xml = cacOpen("PostalAddress", indent)
  if (addr.street) xml += cbc("StreetName", addr.street, indent + 1)
  if (addr.city) xml += cbc("CityName", addr.city, indent + 1)
  if (addr.postalCode) xml += cbc("PostalZone", addr.postalCode, indent + 1)
  xml += cacOpen("Country", indent + 1)
  xml += cbc("IdentificationCode", addr.country, indent + 2)
  xml += cacClose("Country", indent + 1)
  xml += cacClose("PostalAddress", indent)
  return xml
}

function buildSellerParty(seller: EhfSeller, indent: number): string {
  let xml = cacOpen("AccountingSupplierParty", indent)
  xml += cacOpen("Party", indent + 1)

  // EndpointID (PEPPOL participant identifier)
  xml += cbcAttr("EndpointID", seller.orgNumber, 'schemeID="0192"', indent + 2)

  // PartyName
  xml += cacOpen("PartyName", indent + 2)
  xml += cbc("Name", seller.name, indent + 3)
  xml += cacClose("PartyName", indent + 2)

  // PostalAddress
  xml += buildAddress(seller.address, indent + 2)

  // PartyTaxScheme — VAT registration
  if (seller.vatNumber) {
    xml += cacOpen("PartyTaxScheme", indent + 2)
    xml += cbc("CompanyID", seller.vatNumber, indent + 3)
    xml += cacOpen("TaxScheme", indent + 3)
    xml += cbc("ID", "VAT", indent + 4)
    xml += cacClose("TaxScheme", indent + 3)
    xml += cacClose("PartyTaxScheme", indent + 2)
  }

  // PartyTaxScheme — Foretaksregisteret (NO-R-002)
  if (seller.registeredInForetaksregisteret) {
    xml += cacOpen("PartyTaxScheme", indent + 2)
    xml += cbc("CompanyID", "Foretaksregisteret", indent + 3)
    xml += cacOpen("TaxScheme", indent + 3)
    xml += cbc("ID", "TAX", indent + 4)
    xml += cacClose("TaxScheme", indent + 3)
    xml += cacClose("PartyTaxScheme", indent + 2)
  }

  // PartyLegalEntity
  xml += cacOpen("PartyLegalEntity", indent + 2)
  xml += cbc("RegistrationName", seller.name, indent + 3)
  xml += cbcAttr("CompanyID", seller.orgNumber, 'schemeID="0192"', indent + 3)
  xml += cacClose("PartyLegalEntity", indent + 2)

  xml += cacClose("Party", indent + 1)
  xml += cacClose("AccountingSupplierParty", indent)
  return xml
}

function buildBuyerParty(buyer: EhfBuyer, indent: number): string {
  let xml = cacOpen("AccountingCustomerParty", indent)
  xml += cacOpen("Party", indent + 1)

  // EndpointID
  if (buyer.orgNumber) {
    xml += cbcAttr("EndpointID", buyer.orgNumber, 'schemeID="0192"', indent + 2)
  } else if (buyer.email) {
    xml += cbcAttr("EndpointID", buyer.email, 'schemeID="EM"', indent + 2)
  }

  // PartyName
  xml += cacOpen("PartyName", indent + 2)
  xml += cbc("Name", buyer.name, indent + 3)
  xml += cacClose("PartyName", indent + 2)

  // PostalAddress
  xml += buildAddress(buyer.address, indent + 2)

  // PartyLegalEntity
  xml += cacOpen("PartyLegalEntity", indent + 2)
  xml += cbc("RegistrationName", buyer.name, indent + 3)
  if (buyer.orgNumber) {
    xml += cbcAttr("CompanyID", buyer.orgNumber, 'schemeID="0192"', indent + 3)
  }
  xml += cacClose("PartyLegalEntity", indent + 2)

  xml += cacClose("Party", indent + 1)
  xml += cacClose("AccountingCustomerParty", indent)
  return xml
}

// ===== Payment Means =====

function buildPaymentMeans(pm: EhfPaymentMeans, indent: number): string {
  let xml = cacOpen("PaymentMeans", indent)
  xml += cbc("PaymentMeansCode", pm.code, indent + 1)
  if (pm.paymentId) {
    xml += cbc("PaymentID", pm.paymentId, indent + 1)
  }
  if (pm.accountId) {
    xml += cacOpen("PayeeFinancialAccount", indent + 1)
    xml += cbc("ID", pm.accountId, indent + 2)
    if (pm.bic) {
      xml += cacOpen("FinancialInstitutionBranch", indent + 2)
      xml += cbc("ID", pm.bic, indent + 3)
      xml += cacClose("FinancialInstitutionBranch", indent + 2)
    }
    xml += cacClose("PayeeFinancialAccount", indent + 1)
  }
  xml += cacClose("PaymentMeans", indent)
  return xml
}

// ===== Tax =====

function buildTaxTotal(taxSummary: EhfTaxSubtotal[], currency: string, indent: number): string {
  const totalTax = taxSummary.reduce((sum, t) => sum + t.taxAmount, 0)

  let xml = cacOpen("TaxTotal", indent)
  xml += amount("TaxAmount", totalTax, currency, indent + 1)

  for (const sub of taxSummary) {
    xml += cacOpen("TaxSubtotal", indent + 1)
    xml += amount("TaxableAmount", sub.taxableAmount, currency, indent + 2)
    xml += amount("TaxAmount", sub.taxAmount, currency, indent + 2)
    xml += cacOpen("TaxCategory", indent + 2)
    xml += cbc("ID", sub.category, indent + 3)
    xml += cbc("Percent", sub.percent.toFixed(2), indent + 3)
    if (sub.taxExemptionReasonCode) {
      xml += cbc("TaxExemptionReasonCode", sub.taxExemptionReasonCode, indent + 3)
    }
    xml += cacOpen("TaxScheme", indent + 3)
    xml += cbc("ID", "VAT", indent + 4)
    xml += cacClose("TaxScheme", indent + 3)
    xml += cacClose("TaxCategory", indent + 2)
    xml += cacClose("TaxSubtotal", indent + 1)
  }

  xml += cacClose("TaxTotal", indent)
  return xml
}

// ===== Totals =====

function buildLegalMonetaryTotal(totals: EhfTotals, currency: string, indent: number): string {
  let xml = cacOpen("LegalMonetaryTotal", indent)
  xml += amount("LineExtensionAmount", totals.lineExtensionAmount, currency, indent + 1)
  xml += amount("TaxExclusiveAmount", totals.taxExclusiveAmount, currency, indent + 1)
  xml += amount("TaxInclusiveAmount", totals.taxInclusiveAmount, currency, indent + 1)
  xml += amount("PayableAmount", totals.payableAmount, currency, indent + 1)
  xml += cacClose("LegalMonetaryTotal", indent)
  return xml
}

// ===== Invoice Lines =====

function buildInvoiceLine(line: EhfInvoiceLine, currency: string, indent: number, isCredit: boolean): string {
  const lineTag = isCredit ? "CreditNoteLine" : "InvoiceLine"
  const qtyTag = isCredit ? "CreditedQuantity" : "InvoicedQuantity"

  let xml = `${"  ".repeat(indent)}<cac:${lineTag}>\n`
  xml += cbc("ID", line.id, indent + 1)
  xml += cbcAttr(qtyTag, line.quantity.toString(), `unitCode="${line.unitCode}"`, indent + 1)
  xml += amount("LineExtensionAmount", line.lineTotal, currency, indent + 1)

  // Item
  xml += cacOpen("Item", indent + 1)
  xml += cbc("Name", line.description, indent + 2)
  xml += cacOpen("ClassifiedTaxCategory", indent + 2)
  xml += cbc("ID", line.taxCategory, indent + 3)
  xml += cbc("Percent", line.taxPercent.toFixed(2), indent + 3)
  xml += cacOpen("TaxScheme", indent + 3)
  xml += cbc("ID", "VAT", indent + 4)
  xml += cacClose("TaxScheme", indent + 3)
  xml += cacClose("ClassifiedTaxCategory", indent + 2)
  xml += cacClose("Item", indent + 1)

  // Price
  xml += cacOpen("Price", indent + 1)
  xml += amount("PriceAmount", line.unitPrice, currency, indent + 2)
  xml += cacClose("Price", indent + 1)

  xml += `${"  ".repeat(indent)}</cac:${lineTag}>\n`
  return xml
}

// ===== Document Generators =====

function buildDocumentBody(data: EhfDocumentData): string {
  const indent = 1
  const isCredit = data.type === "creditNote"
  let xml = ""

  xml += cbc("CustomizationID", CUSTOMIZATION_ID, indent)
  xml += cbc("ProfileID", PROFILE_ID, indent)
  xml += cbc("ID", data.invoiceNumber, indent)
  xml += cbc("IssueDate", data.issueDate, indent)
  if (data.dueDate) {
    xml += cbc("DueDate", data.dueDate, indent)
  }
  xml += cbc(isCredit ? "CreditNoteTypeCode" : "InvoiceTypeCode", data.invoiceTypeCode, indent)
  xml += cbc("DocumentCurrencyCode", data.currency, indent)

  if (data.buyerReference) {
    xml += cbc("BuyerReference", data.buyerReference, indent)
  }

  // OrderReference
  if (data.orderReference) {
    xml += cacOpen("OrderReference", indent)
    xml += cbc("ID", data.orderReference, indent + 1)
    xml += cacClose("OrderReference", indent)
  }

  // BillingReference (credit notes only)
  if (isCredit && data.originalInvoiceRef) {
    xml += cacOpen("BillingReference", indent)
    xml += cacOpen("InvoiceDocumentReference", indent + 1)
    xml += cbc("ID", data.originalInvoiceRef, indent + 2)
    xml += cacClose("InvoiceDocumentReference", indent + 1)
    xml += cacClose("BillingReference", indent)
  }

  // Parties
  xml += buildSellerParty(data.seller, indent)
  xml += buildBuyerParty(data.buyer, indent)

  // PaymentMeans
  if (data.paymentMeans) {
    xml += buildPaymentMeans(data.paymentMeans, indent)
  }

  // PaymentTerms
  if (data.paymentTermsNote) {
    xml += cacOpen("PaymentTerms", indent)
    xml += cbc("Note", data.paymentTermsNote, indent + 1)
    xml += cacClose("PaymentTerms", indent)
  }

  // TaxTotal
  xml += buildTaxTotal(data.taxSummary, data.currency, indent)

  // LegalMonetaryTotal
  xml += buildLegalMonetaryTotal(data.totals, data.currency, indent)

  // Lines
  for (const line of data.lines) {
    xml += buildInvoiceLine(line, data.currency, indent, isCredit)
  }

  return xml
}

export function generateEhfInvoiceXml(data: EhfDocumentData): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<Invoice xmlns="${NS_INVOICE}" xmlns:cac="${NS_CAC}" xmlns:cbc="${NS_CBC}">\n`
  xml += buildDocumentBody(data)
  xml += `</Invoice>\n`
  return xml
}

export function generateEhfCreditNoteXml(data: EhfDocumentData): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<CreditNote xmlns="${NS_CREDIT_NOTE}" xmlns:cac="${NS_CAC}" xmlns:cbc="${NS_CBC}">\n`
  xml += buildDocumentBody(data)
  xml += `</CreditNote>\n`
  return xml
}
