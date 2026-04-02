# EHF Invoicing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate valid EHF 3.0 (PEPPOL BIS Billing 3.0 / UBL 2.1) invoice and credit note XML from existing invoice data, with structural validation and download flow.

**Architecture:** Three new modules (xml-utils, ehf-generator, ehf-validator) plus a server action and API route. Credit notes reuse the Invoice model with a type discriminator. Follows the established SAF-T XML generation pattern (string concatenation with helper functions).

**Tech Stack:** Next.js 16, Prisma 7, Zod 4, TypeScript, UBL 2.1 XML

**Spec:** `docs/superpowers/specs/2026-04-02-ehf-invoicing-design.md`

---

## Chunk 1: Foundation — Schema, XML Utils, Types

### Task 1: Prisma Schema — Add InvoiceType Enum and Credit Note Fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add InvoiceType enum and new fields to schema**

Add after the existing `InvoiceStatus` enum (around line 20):

```prisma
enum InvoiceType {
  INVOICE
  CREDIT_NOTE
}
```

Add these fields to the `Invoice` model (after `status` field):

```prisma
  invoiceType       InvoiceType @default(INVOICE)
  originalInvoiceId String?
  originalInvoice   Invoice?    @relation("CreditNoteRef", fields: [originalInvoiceId], references: [id])
  creditNotes       Invoice[]   @relation("CreditNoteRef")
```

- [ ] **Step 2: Run migration**

Run: `npx prisma migrate dev --name add-invoice-type-and-credit-notes`
Expected: Migration created and applied successfully.

- [ ] **Step 3: Generate Prisma client**

Run: `npx prisma generate`
Expected: Client generated to `src/generated/prisma/`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/generated/
git commit -m "feat: add InvoiceType enum and credit note fields to schema"
```

---

### Task 2: Shared XML Utilities (`src/lib/xml-utils.ts`)

**Files:**
- Create: `src/lib/xml-utils.ts`
- Modify: `src/lib/saft-generator.ts` (import from xml-utils instead of local)

- [ ] **Step 1: Create xml-utils.ts with shared functions**

```ts
/**
 * Shared XML utilities used by both SAF-T and EHF generators.
 */

/** Escape special XML characters in text content. */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** Format a Date as YYYY-MM-DD for XML date fields. */
export function formatXmlDate(date: Date): string {
  return date.toISOString().split("T")[0]
}
```

- [ ] **Step 2: Update saft-generator.ts to import from xml-utils**

Replace the local `escapeXml` function in `src/lib/saft-generator.ts` with an import:

```ts
import { escapeXml } from "./xml-utils"
```

Remove the local `escapeXml` function (lines 95-102 of saft-generator.ts).

Update the `el()` helper to use the imported `escapeXml` (it already calls it, just needs the import).

Also update `saft-codes.ts` references: `oreToSaftAmount` stays in `saft-codes.ts` since it's SAF-T specific (returns string, used only by SAF-T). `formatSaftDate` also stays. No need to change saft-codes.ts.

- [ ] **Step 3: Verify SAF-T still works**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/xml-utils.ts src/lib/saft-generator.ts
git commit -m "refactor: extract shared XML utilities from SAF-T generator"
```

---

### Task 3: EHF Type Definitions

**Files:**
- Create: `src/lib/ehf-types.ts`

- [ ] **Step 1: Create ehf-types.ts with all EHF data types**

```ts
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ehf-types.ts
git commit -m "feat: add EHF document type definitions"
```

---

## Chunk 2: EHF Validator

### Task 4: EHF Validator (`src/lib/ehf-validator.ts`)

**Files:**
- Create: `src/lib/ehf-validator.ts`

- [ ] **Step 1: Create the validator**

```ts
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
    errors.push({ field: "issueDate", message: "Fakturadato må være gyldig YYYY-MM-DD format" })
  }
  if (data.lines.length === 0) {
    errors.push({ field: "lines", message: "Minst én fakturalinje er påkrevd", rule: "BR-16" })
  }

  // Seller required fields
  if (!data.seller.name) {
    errors.push({ field: "seller.name", message: "Selgers navn er påkrevd", rule: "BR-6" })
  }
  if (!data.seller.orgNumber || !ORG_NUMBER_RE.test(data.seller.orgNumber)) {
    errors.push({ field: "seller.orgNumber", message: "Selgers organisasjonsnummer må være 9 siffer" })
  }
  if (!data.seller.address.city) {
    errors.push({ field: "seller.address.city", message: "Selgers by er påkrevd", rule: "BR-9" })
  }
  if (!data.seller.address.postalCode) {
    errors.push({ field: "seller.address.postalCode", message: "Selgers postnummer er påkrevd" })
  }
  if (!data.seller.address.country) {
    errors.push({ field: "seller.address.country", message: "Selgers landkode er påkrevd", rule: "BR-9" })
  }

  // VAT number format
  if (data.seller.vatNumber && !VAT_NUMBER_RE.test(data.seller.vatNumber)) {
    errors.push({ field: "seller.vatNumber", message: "MVA-nummer må ha format NO{9 siffer}MVA" })
  }

  // Buyer required fields
  if (!data.buyer.name) {
    errors.push({ field: "buyer.name", message: "Kjøpers navn er påkrevd", rule: "BR-7" })
  }
  if (!data.buyer.address.city) {
    errors.push({ field: "buyer.address.city", message: "Kjøpers by er påkrevd", rule: "BR-11" })
  }
  if (!data.buyer.address.postalCode) {
    errors.push({ field: "buyer.address.postalCode", message: "Kjøpers postnummer er påkrevd" })
  }
  if (!data.buyer.address.country) {
    errors.push({ field: "buyer.address.country", message: "Kjøpers landkode er påkrevd", rule: "BR-11" })
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
    // Lines in this category may each contribute rounding error
    const linesInCategory = data.lines.filter(
      (l) => l.taxCategory === sub.category && l.taxPercent === sub.percent
    ).length
    const expectedTax = sub.taxableAmount * sub.percent / 100
    if (Math.abs(sub.taxAmount - expectedTax) > ROUNDING_TOLERANCE * Math.max(linesInCategory, 1)) {
      errors.push({
        field: "taxSummary",
        message: `MVA-beløp ${sub.taxAmount} matcher ikke grunnlag * sats for ${sub.category} ${sub.percent}%`,
      })
    }
    if (sub.category === "E" && !sub.taxExemptionReasonCode) {
      errors.push({
        field: "taxSummary.taxExemptionReasonCode",
        message: "Fritakskode (VATEX) er påkrevd for fritak-kategorier i MVA-oppsummering",
      })
    }
  }

  // Totals
  const sumLineTotals = data.lines.reduce((s, l) => s + l.lineTotal, 0)
  if (Math.abs(data.totals.lineExtensionAmount - sumLineTotals) > ROUNDING_TOLERANCE * lineCount) {
    errors.push({
      field: "totals.lineExtensionAmount",
      message: "Summen av linjebeløp matcher ikke lineExtensionAmount",
      rule: "BR-12",
    })
  }

  const sumTaxAmounts = data.taxSummary.reduce((s, t) => s + t.taxAmount, 0)
  const expectedTaxInclusive = data.totals.taxExclusiveAmount + sumTaxAmounts
  if (Math.abs(data.totals.taxInclusiveAmount - expectedTaxInclusive) > ROUNDING_TOLERANCE) {
    errors.push({
      field: "totals.taxInclusiveAmount",
      message: "taxInclusiveAmount matcher ikke taxExclusiveAmount + sum MVA",
      rule: "BR-14",
    })
  }

  if (Math.abs(data.totals.payableAmount - data.totals.taxInclusiveAmount) > ROUNDING_TOLERANCE) {
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
    warnings.push({ field: "buyer.orgNumber", message: "Kjøpers org.nr mangler — uvanlig for B2B" })
  }
  if (!data.paymentMeans) {
    warnings.push({ field: "paymentMeans", message: "Betalingsinformasjon mangler" })
  }
  if (data.paymentMeans && !data.paymentMeans.paymentId) {
    warnings.push({ field: "paymentMeans.paymentId", message: "KID-nummer mangler" })
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ehf-validator.ts
git commit -m "feat: add EHF structural validator"
```

---

## Chunk 3: EHF XML Generator

### Task 5: EHF Invoice XML Generator (`src/lib/ehf-generator.ts`)

**Files:**
- Create: `src/lib/ehf-generator.ts`

This is the largest task. The generator builds UBL 2.1 XML using string concatenation (same pattern as `saft-generator.ts`).

- [ ] **Step 1: Create ehf-generator.ts with XML builder helpers and invoice generation**

```ts
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

function buildAddress(addr: { street?: string; city?: string; postalCode?: string; country: string }, indent: number): string {
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

function buildPaymentMeans(pm: EhfPaymentMeans, currency: string, dueDate: string | undefined, indent: number): string {
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
    xml += buildPaymentMeans(data.paymentMeans, data.currency, data.dueDate, indent)
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ehf-generator.ts
git commit -m "feat: add EHF invoice and credit note XML generator"
```

---

## Chunk 4: Shared Mapper, Server Action, API Route, and UI

### Task 6: Shared Invoice-to-EHF Mapper (`src/lib/ehf-mapper.ts`)

**Files:**
- Create: `src/lib/ehf-mapper.ts`

This eliminates duplication between the server action and API route. Both call this pure mapping function.

- [ ] **Step 1: Create ehf-mapper.ts**

```ts
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ehf-mapper.ts
git commit -m "feat: add shared invoice-to-EHF data mapper"
```

---

### Task 7: EHF Export Server Action (`src/actions/ehf-export.ts`)

**Files:**
- Create: `src/actions/ehf-export.ts`

- [ ] **Step 1: Create the server action**

Uses the shared mapper — no duplicated mapping logic.

```ts
"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { validateEhfData } from "@/lib/ehf-validator"
import { generateEhfInvoiceXml, generateEhfCreditNoteXml } from "@/lib/ehf-generator"
import { mapInvoiceToEhfData } from "@/lib/ehf-mapper"
import type { EhfValidationError } from "@/lib/ehf-types"

export async function exportEhfXml(invoiceId: string): Promise<{
  xml?: string
  filename?: string
  errors?: EhfValidationError[]
}> {
  const { team } = await getCurrentTeam()

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, teamId: team.id },
    include: {
      customer: true,
      lines: true,
      originalInvoice: { select: { invoiceNumber: true } },
    },
  })

  if (!invoice) {
    return { errors: [{ field: "_form", message: "Fakturaen ble ikke funnet." }] }
  }

  if (!team.orgNumber) {
    return { errors: [{ field: "seller.orgNumber", message: "Organisasjonsnummer mangler i innstillinger." }] }
  }

  const data = mapInvoiceToEhfData(invoice, team)

  const validation = validateEhfData(data)
  if (!validation.valid) {
    return { errors: validation.errors }
  }

  const xml = data.type === "creditNote"
    ? generateEhfCreditNoteXml(data)
    : generateEhfInvoiceXml(data)

  const filename = `EHF-${invoice.invoiceNumber}-${team.orgNumber}.xml`

  return { xml, filename }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/ehf-export.ts
git commit -m "feat: add EHF export server action"
```

---

### Task 8: EHF Download API Route

**Files:**
- Create: `src/app/api/faktura/[id]/ehf/route.ts`

Note: API routes cannot use `getCurrentTeam()` because it throws a redirect (not a JSON 401 response). This follows the same manual auth pattern as the existing PDF route at `src/app/api/faktura/[id]/pdf/route.ts`.

- [ ] **Step 1: Create the API route**

```ts
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { validateEhfData } from "@/lib/ehf-validator"
import { generateEhfInvoiceXml, generateEhfCreditNoteXml } from "@/lib/ehf-generator"
import { mapInvoiceToEhfData } from "@/lib/ehf-mapper"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 })
  }

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { team: true },
  })

  if (!membership) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 })
  }

  const team = membership.team

  if (!team.orgNumber) {
    return NextResponse.json(
      { error: "Organisasjonsnummer mangler i innstillinger" },
      { status: 400 }
    )
  }

  const invoice = await db.invoice.findFirst({
    where: { id, teamId: team.id },
    include: {
      customer: true,
      lines: true,
      originalInvoice: { select: { invoiceNumber: true } },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: "Faktura ikke funnet" }, { status: 404 })
  }

  const data = mapInvoiceToEhfData(invoice, team)

  const validation = validateEhfData(data)
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Valideringsfeil", details: validation.errors },
      { status: 400 }
    )
  }

  const xml = data.type === "creditNote"
    ? generateEhfCreditNoteXml(data)
    : generateEhfInvoiceXml(data)

  const filename = `EHF-${invoice.invoiceNumber}-${team.orgNumber}.xml`

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/faktura/[id]/ehf/route.ts
git commit -m "feat: add EHF XML download API route"
```

---

### Task 9: UI — Add EHF Download and Credit Note Buttons

**Files:**
- Modify: `src/components/invoice-actions.tsx`

- [ ] **Step 1: Add EHF download button and credit note button**

Update `src/components/invoice-actions.tsx`. Add imports and update props:

```ts
import { createCreditNote } from "@/actions/invoices"
import type { InvoiceStatus, InvoiceType } from "@/generated/prisma/client"
import { Send, CheckCircle, Pencil, Trash2, Download, FileText, CreditCard } from "lucide-react"

type InvoiceActionsProps = {
  invoiceId: string
  status: InvoiceStatus
  invoiceType?: InvoiceType
  hasOrgNumber?: boolean
}
```

Add the EHF button after the existing PDF button:

```tsx
{/* EHF download — only for sent/paid invoices with org number */}
{(status === "SENT" || status === "PAID") && hasOrgNumber && (
  <>
    <Button variant="outline" render={<Link href={`/api/faktura/${invoiceId}/ehf`} target="_blank" />}>
      <FileText className="size-4" />
      Last ned EHF
    </Button>
    <a
      href="https://peppolvalidator.com/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-muted-foreground hover:underline self-center"
    >
      Valider EHF &rarr;
    </a>
  </>
)}
```

Add the credit note button — uses onClick to call `createCreditNote` server action directly (no route handler needed):

```tsx
{/* Create credit note — only for regular invoices */}
{(status === "SENT" || status === "PAID") && invoiceType !== "CREDIT_NOTE" && (
  <Button
    variant="outline"
    disabled={isPending}
    onClick={() => {
      startTransition(async () => {
        const result = await createCreditNote(invoiceId)
        if (result.errors?._form) {
          alert(result.errors._form[0])
        }
      })
    }}
  >
    <CreditCard className="size-4" />
    Opprett kreditnota
  </Button>
)}
```

- [ ] **Step 2: Update the invoice detail page to pass new props**

In `src/app/(dashboard)/faktura/[id]/page.tsx`, update the `InvoiceActions` usage:

```tsx
<InvoiceActions
  invoiceId={invoice.id}
  status={invoice.status}
  invoiceType={invoice.invoiceType}
  hasOrgNumber={!!team.orgNumber}
/>
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/invoice-actions.tsx src/app/(dashboard)/faktura/[id]/page.tsx
git commit -m "feat: add EHF download and credit note buttons to invoice page"
```

---

## Chunk 5: Credit Note Creation

### Task 10: Credit Note Server Action

**Files:**
- Modify: `src/actions/invoices.ts`

- [ ] **Step 1: Add createCreditNote action**

Add this function at the bottom of `src/actions/invoices.ts`:

```ts
export async function createCreditNote(
  originalInvoiceId: string
): Promise<InvoiceActionResult & { invoiceId?: string }> {
  const { user, team } = await getCurrentTeam()

  // Fetch original invoice with lines
  const original = await db.invoice.findFirst({
    where: { id: originalInvoiceId, teamId: team.id },
    include: { lines: true, creditNotes: { select: { total: true } } },
  })

  if (!original) {
    return { errors: { _form: ["Fakturaen ble ikke funnet."] } }
  }

  if (original.status !== "SENT" && original.status !== "PAID") {
    return { errors: { _form: ["Kan kun opprette kreditnota for sendte eller betalte fakturaer."] } }
  }

  if (original.invoiceType === "CREDIT_NOTE") {
    return { errors: { _form: ["Kan ikke opprette kreditnota for en kreditnota."] } }
  }

  // Over-crediting check
  const existingCreditTotal = original.creditNotes.reduce((sum, cn) => sum + cn.total, 0)
  if (existingCreditTotal >= original.total) {
    return { errors: { _form: ["Fakturaen er allerede fullt kreditert."] } }
  }

  let invoiceId: string

  try {
    const result = await db.$transaction(async (tx) => {
      const updatedTeam = await tx.team.update({
        where: { id: team.id },
        data: { invoiceNumberSeq: { increment: 1 } },
      })

      const invoiceNumber = updatedTeam.invoiceNumberSeq - 1
      const kidNumber = generateKID(invoiceNumber)

      // Copy lines from original
      const creditLines = original.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        mvaRate: line.mvaRate,
        lineTotal: line.lineTotal,
        mvaAmount: line.mvaAmount,
      }))

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          kidNumber,
          invoiceType: "CREDIT_NOTE",
          originalInvoiceId,
          customerId: original.customerId,
          teamId: team.id,
          createdById: user.id,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          subtotal: original.subtotal,
          mvaAmount: original.mvaAmount,
          total: original.total,
          notes: `Kreditnota for faktura #${original.invoiceNumber}`,
          lines: { create: creditLines },
        },
      })

      return invoice
    })

    invoiceId = result.id
  } catch {
    return {
      errors: { _form: ["Noe gikk galt ved opprettelse av kreditnotaen."] },
    }
  }

  revalidatePath("/faktura")
  redirect(`/faktura/${invoiceId}`)
}
```

- [ ] **Step 2: Update updateInvoiceStatus to handle credit note journal entries**

In the `updateInvoiceStatus` function in `src/actions/invoices.ts`:

**First**, change the existing condition at line 278 from:
```ts
if (status === "SENT" && existing.status === "DRAFT") {
```
to:
```ts
if (status === "SENT" && existing.status === "DRAFT" && existing.invoiceType !== "CREDIT_NOTE") {
```

This prevents the regular invoice journal entries from also running for credit notes.

**Second**, add the credit note journal entry block immediately after the closing `}` of the existing SENT block:

```ts
// Credit note journal entry — reverses the original revenue
if (status === "SENT" && existing.status === "DRAFT" && existing.invoiceType === "CREDIT_NOTE") {
  const cnLines: JournalLineInput[] = [
    {
      accountCode: "1500",
      debitAmount: 0,
      creditAmount: existing.total,
      description: `Kreditnota #${existing.invoiceNumber} - reversering kundefordring`,
    },
  ]

  if (team.mvaRegistered && existing.mvaAmount > 0) {
    cnLines.push(
      {
        accountCode: "3000",
        debitAmount: existing.subtotal,
        creditAmount: 0,
        description: `Kreditnota #${existing.invoiceNumber} - reversering salgsinntekt`,
      },
      {
        accountCode: "2700",
        debitAmount: existing.mvaAmount,
        creditAmount: 0,
        description: `Kreditnota #${existing.invoiceNumber} - reversering utgående MVA`,
      }
    )
  } else {
    cnLines.push({
      accountCode: existing.mvaAmount > 0 ? "3000" : "3100",
      debitAmount: existing.total,
      creditAmount: 0,
      description: `Kreditnota #${existing.invoiceNumber} - reversering salgsinntekt`,
    })
  }

  await createJournalEntry(tx, {
    teamId: team.id,
    date: existing.issueDate,
    description: `Kreditnota #${existing.invoiceNumber} sendt`,
    lines: cnLines,
    invoiceId: id,
  })
}
```


- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/actions/invoices.ts
git commit -m "feat: add credit note creation with over-crediting prevention and journal entries"
```

---

### Task 11: Invoice Detail Page — Show Credit Note Context

**Files:**
- Modify: `src/app/(dashboard)/faktura/[id]/page.tsx`

- [ ] **Step 1: Update the invoice query to include credit note relations**

Update the `db.invoice.findFirst` query to include:

```ts
const invoice = await db.invoice.findFirst({
  where: { id, teamId: team.id },
  include: {
    customer: true,
    lines: true,
    originalInvoice: { select: { id: true, invoiceNumber: true } },
    creditNotes: { select: { id: true, invoiceNumber: true, status: true, total: true } },
  },
})
```

- [ ] **Step 2: Add credit note context to the page**

After the header section, if this is a credit note, show a link to the original invoice:

```tsx
{invoice.invoiceType === "CREDIT_NOTE" && invoice.originalInvoice && (
  <Card>
    <CardContent className="pt-4">
      <p className="text-sm text-muted-foreground">
        Kreditnota for{" "}
        <Link href={`/faktura/${invoice.originalInvoice.id}`} className="font-medium text-primary hover:underline">
          Faktura #{invoice.originalInvoice.invoiceNumber}
        </Link>
      </p>
    </CardContent>
  </Card>
)}
```

If this is an invoice with credit notes, show a list:

```tsx
{invoice.creditNotes.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm text-muted-foreground">Kreditnotaer</CardTitle>
    </CardHeader>
    <CardContent className="space-y-1">
      {invoice.creditNotes.map((cn) => (
        <div key={cn.id} className="flex items-center justify-between text-sm">
          <Link href={`/faktura/${cn.id}`} className="font-medium text-primary hover:underline">
            Kreditnota #{cn.invoiceNumber}
          </Link>
          <span className="text-muted-foreground">{formatCurrency(cn.total)}</span>
        </div>
      ))}
    </CardContent>
  </Card>
)}
```

- [ ] **Step 3: Update the page title for credit notes**

In the header `<h1>`, differentiate credit notes:

```tsx
<h1 className="text-2xl font-bold tracking-tight">
  {invoice.invoiceType === "CREDIT_NOTE" ? "Kreditnota" : "Faktura"} #{invoice.invoiceNumber}
</h1>
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/faktura/[id]/page.tsx
git commit -m "feat: show credit note context on invoice detail page"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Final commit (if any remaining changes)**

```bash
git status
```

If there are any unstaged changes, add and commit them with an appropriate message.
