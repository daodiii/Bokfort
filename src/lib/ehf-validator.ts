/**
 * EHF structural validator — pre-flight checks before XML generation.
 * Catches common errors that would fail PEPPOL Schematron validation.
 */

import type {
  EhfDocumentData,
  EhfValidationError,
  EhfValidationResult,
} from "./ehf-types"

const ORG_NUMBER_RE = /^\d{9}$/
const VAT_NUMBER_RE = /^NO\d{9}MVA$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const VALID_TAX_COMBOS: Record<string, number[]> = {
  S: [25, 15, 12],
  E: [0],
  Z: [0],
}
const ROUNDING_TOLERANCE = 0.01

export function validateEhfData(data: EhfDocumentData): EhfValidationResult {
  const errors: EhfValidationError[] = []
  const warnings: EhfValidationError[] = []

  // === Required fields ===
  if (!data.invoiceNumber) {
    errors.push({ field: "invoiceNumber", message: "Fakturanummer er påkrevd" })
  }
  if (!data.issueDate || !DATE_RE.test(data.issueDate)) {
    errors.push({
      field: "issueDate",
      message: "Fakturadato må være gyldig YYYY-MM-DD format",
    })
  }
  if (data.lines.length === 0) {
    errors.push({
      field: "lines",
      message: "Minst én fakturalinje er påkrevd",
      rule: "BR-16",
    })
  }

  // Seller required fields
  if (!data.seller.name) {
    errors.push({
      field: "seller.name",
      message: "Selgers navn er påkrevd",
      rule: "BR-6",
    })
  }
  if (!data.seller.orgNumber || !ORG_NUMBER_RE.test(data.seller.orgNumber)) {
    errors.push({
      field: "seller.orgNumber",
      message: "Selgers organisasjonsnummer må være 9 siffer",
    })
  }
  if (!data.seller.address.city) {
    errors.push({
      field: "seller.address.city",
      message: "Selgers by er påkrevd",
      rule: "BR-9",
    })
  }
  if (!data.seller.address.postalCode) {
    errors.push({
      field: "seller.address.postalCode",
      message: "Selgers postnummer er påkrevd",
    })
  }
  if (!data.seller.address.country) {
    errors.push({
      field: "seller.address.country",
      message: "Selgers landkode er påkrevd",
      rule: "BR-9",
    })
  }

  // VAT number format
  if (data.seller.vatNumber && !VAT_NUMBER_RE.test(data.seller.vatNumber)) {
    errors.push({
      field: "seller.vatNumber",
      message: "MVA-nummer må ha format NO{9 siffer}MVA",
    })
  }

  // Buyer required fields
  if (!data.buyer.name) {
    errors.push({
      field: "buyer.name",
      message: "Kjøpers navn er påkrevd",
      rule: "BR-7",
    })
  }
  if (!data.buyer.address.city) {
    errors.push({
      field: "buyer.address.city",
      message: "Kjøpers by er påkrevd",
      rule: "BR-11",
    })
  }
  if (!data.buyer.address.postalCode) {
    errors.push({
      field: "buyer.address.postalCode",
      message: "Kjøpers postnummer er påkrevd",
    })
  }
  if (!data.buyer.address.country) {
    errors.push({
      field: "buyer.address.country",
      message: "Kjøpers landkode er påkrevd",
      rule: "BR-11",
    })
  }

  // === Tax consistency ===
  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i]
    const validPercents = VALID_TAX_COMBOS[line.taxCategory]
    if (!validPercents) {
      errors.push({
        field: `lines[${i}].taxCategory`,
        message: `Ugyldig skattekategori: ${line.taxCategory}`,
      })
    } else if (!validPercents.includes(line.taxPercent)) {
      errors.push({
        field: `lines[${i}].taxPercent`,
        message: `MVA-sats ${line.taxPercent}% er ugyldig for kategori ${line.taxCategory}`,
      })
    }
    if (line.taxCategory === "E" && !line.taxExemptionReasonCode) {
      errors.push({
        field: `lines[${i}].taxExemptionReasonCode`,
        message: "Fritakskode (VATEX) er påkrevd for MVA-fritatte linjer",
        rule: "BR-E-10",
      })
    }
  }

  // === Arithmetic checks ===
  const lineCount = data.lines.length

  // Line totals
  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i]
    const expected = line.quantity * line.unitPrice
    if (Math.abs(line.lineTotal - expected) > ROUNDING_TOLERANCE) {
      errors.push({
        field: `lines[${i}].lineTotal`,
        message: `Linjesum ${line.lineTotal} matcher ikke antall * enhetspris (${expected.toFixed(2)})`,
      })
    }
  }

  // Tax summary
  for (const sub of data.taxSummary) {
    const linesInCategory = data.lines.filter(
      (l) => l.taxCategory === sub.category && l.taxPercent === sub.percent
    ).length
    const expectedTax = (sub.taxableAmount * sub.percent) / 100
    if (
      Math.abs(sub.taxAmount - expectedTax) >
      ROUNDING_TOLERANCE * Math.max(linesInCategory, 1)
    ) {
      errors.push({
        field: "taxSummary",
        message: `MVA-beløp ${sub.taxAmount} matcher ikke grunnlag * sats for ${sub.category} ${sub.percent}%`,
      })
    }
    if (sub.category === "E" && !sub.taxExemptionReasonCode) {
      errors.push({
        field: "taxSummary.taxExemptionReasonCode",
        message:
          "Fritakskode (VATEX) er påkrevd for fritak-kategorier i MVA-oppsummering",
      })
    }
  }

  // Totals
  const sumLineTotals = data.lines.reduce((s, l) => s + l.lineTotal, 0)
  if (
    Math.abs(data.totals.lineExtensionAmount - sumLineTotals) >
    ROUNDING_TOLERANCE * lineCount
  ) {
    errors.push({
      field: "totals.lineExtensionAmount",
      message: "Summen av linjebeløp matcher ikke lineExtensionAmount",
      rule: "BR-12",
    })
  }

  const sumTaxAmounts = data.taxSummary.reduce((s, t) => s + t.taxAmount, 0)
  const expectedTaxInclusive = data.totals.taxExclusiveAmount + sumTaxAmounts
  if (
    Math.abs(data.totals.taxInclusiveAmount - expectedTaxInclusive) >
    ROUNDING_TOLERANCE
  ) {
    errors.push({
      field: "totals.taxInclusiveAmount",
      message: "taxInclusiveAmount matcher ikke taxExclusiveAmount + sum MVA",
      rule: "BR-14",
    })
  }

  if (
    Math.abs(data.totals.payableAmount - data.totals.taxInclusiveAmount) >
    ROUNDING_TOLERANCE
  ) {
    errors.push({
      field: "totals.payableAmount",
      message: "payableAmount matcher ikke taxInclusiveAmount",
      rule: "BR-15",
    })
  }

  // === Credit note checks ===
  if (data.type === "creditNote" && !data.originalInvoiceRef) {
    errors.push({
      field: "originalInvoiceRef",
      message: "Kreditnota må referere til opprinnelig fakturanummer",
    })
  }

  // === Warnings ===
  if (!data.buyer.orgNumber) {
    warnings.push({
      field: "buyer.orgNumber",
      message: "Kjøpers org.nr mangler — uvanlig for B2B",
    })
  }
  if (!data.paymentMeans) {
    warnings.push({
      field: "paymentMeans",
      message: "Betalingsinformasjon mangler",
    })
  }
  if (data.paymentMeans && !data.paymentMeans.paymentId) {
    warnings.push({
      field: "paymentMeans.paymentId",
      message: "KID-nummer mangler",
    })
  }
  if (!data.dueDate) {
    warnings.push({ field: "dueDate", message: "Forfallsdato mangler" })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
