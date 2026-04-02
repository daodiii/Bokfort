# EHF Invoicing Design Spec

## Overview

Add EHF (Elektronisk Handelsformat) invoice and credit note generation to Bokfort. EHF 3.0 = PEPPOL BIS Billing 3.0 = UBL 2.1 XML. This phase covers XML generation, structural validation, and download flow. AP (Access Point) API integration for PEPPOL network delivery is deferred to a follow-up phase.

## Goals

1. Generate valid EHF 3.0 invoice XML from existing invoice data
2. Generate valid EHF 3.0 credit note XML
3. Validate invoice data before XML generation (structural pre-flight checks)
4. Provide download flow on invoice detail page
5. Extend the data model to support credit notes
6. Architecture ready for future AP API integration

## Non-Goals

- PEPPOL AP integration (AS4 transport, SMP lookup)
- Full Schematron validation (users can validate at peppolvalidator.com)
- EHF order, despatch advice, or catalogue formats
- Automatic sending via email or PEPPOL

## Architecture

Three new modules following the established SAF-T pattern:

```
src/lib/ehf-generator.ts     -- Pure UBL 2.1 XML builder (invoice + credit note)
src/lib/ehf-validator.ts      -- Structural validation before export
src/actions/ehf-export.ts     -- Server action: fetch data, generate, return XML
```

Plus UI changes on the invoice detail page and a new API route for download.

## Data Model Changes

### New enum and fields on Invoice

```prisma
enum InvoiceType {
  INVOICE
  CREDIT_NOTE
}

model Invoice {
  // ... existing fields ...
  invoiceType       InvoiceType @default(INVOICE)
  originalInvoiceId String?
  originalInvoice   Invoice?    @relation("CreditNoteRef", fields: [originalInvoiceId], references: [id])
  creditNotes       Invoice[]   @relation("CreditNoteRef")
}
```

Credit notes reuse the Invoice model. `originalInvoiceId` references the invoice being credited.

### Credit Note Business Rules

1. **Status constraints**: Credit notes use statuses DRAFT, SENT, PAID. Never OVERDUE (they represent money owed back, not receivables).
2. **Multiple credit notes**: Allowed per invoice (partial credits are common in practice).
3. **Over-crediting prevention**: The `createCreditNote` action validates that the sum of all existing credit notes for an invoice plus the new credit note does not exceed the original invoice total.
4. **Original invoice status**: The original invoice status does not change when a credit note is created. The accounting impact is handled by journal entries.
5. **Numbering**: Credit notes share the same `invoiceNumberSeq` as invoices. They are distinguished by `invoiceType`, not by number prefix.

## EHF Generator (`src/lib/ehf-generator.ts`)

### Input Type

```ts
type EhfPartyAddress = {
  street?: string
  city?: string
  postalCode?: string
  country: string // ISO 3166-1 alpha-2, e.g. "NO"
}

type EhfSeller = {
  name: string
  orgNumber: string         // 9-digit Norwegian org number
  vatNumber?: string        // "NO{orgNr}MVA" if MVA registered
  companyType: 'ENK' | 'AS'
  registeredInForetaksregisteret: boolean // true for all AS, optional for ENK
  address: EhfPartyAddress
  bankAccount?: string      // BBAN or IBAN
  bic?: string
}

type EhfBuyer = {
  name: string
  orgNumber?: string
  address: EhfPartyAddress
  email?: string
}

type EhfPaymentMeans = {
  code: string              // "30" = credit transfer, "31" = debit transfer
  paymentId?: string        // KID number
  accountId?: string        // BBAN or IBAN
  bic?: string
}

type EhfTaxCategory = 'S' | 'E' | 'Z'
type MvaRate = 0 | 12 | 15 | 25  // From src/lib/mva.ts

type EhfInvoiceLine = {
  id: string                // Sequential line number "1", "2", etc.
  description: string
  quantity: number
  unitCode: string          // UN/ECE rec 20 unit code, default "EA"
  unitPrice: number         // Decimal NOK (converted from øre by server action)
  lineTotal: number         // Decimal NOK (converted from øre by server action)
  taxCategory: EhfTaxCategory
  taxPercent: MvaRate
  taxExemptionReasonCode?: string  // Required for E-category (VATEX code list)
}

type EhfTaxSubtotal = {
  category: EhfTaxCategory
  percent: MvaRate
  taxableAmount: number     // Decimal NOK (converted from øre)
  taxAmount: number         // Decimal NOK (converted from øre)
  taxExemptionReasonCode?: string  // Required for E-category
}

type EhfTotals = {
  lineExtensionAmount: number   // Sum of line totals (net)
  taxExclusiveAmount: number    // Same as lineExtensionAmount (no doc-level charges)
  taxInclusiveAmount: number    // Net + tax
  payableAmount: number         // Amount due
}

type EhfDocumentData = {
  type: 'invoice' | 'creditNote'
  invoiceTypeCode: string       // "380" for invoice, "381" for credit note
  invoiceNumber: string
  issueDate: string             // YYYY-MM-DD
  dueDate?: string              // YYYY-MM-DD
  currency: string              // ISO 4217, "NOK"
  buyerReference?: string       // Required for public sector buyers
  orderReference?: string       // Purchase order number (BT-13)
  paymentTermsNote?: string     // e.g. "Netto 14 dager"
  originalInvoiceRef?: string   // Credit notes only: original invoice number
  seller: EhfSeller
  buyer: EhfBuyer
  paymentMeans?: EhfPaymentMeans
  lines: EhfInvoiceLine[]
  taxSummary: EhfTaxSubtotal[]
  totals: EhfTotals
}
```

### Exported Functions

```ts
function generateEhfInvoiceXml(data: EhfDocumentData): string
function generateEhfCreditNoteXml(data: EhfDocumentData): string
```

### XML Structure

Both functions produce UBL 2.1 XML with these namespaces:
- Invoice root: `urn:oasis:names:specification:ubl:schema:xsd:Invoice-2`
- CreditNote root: `urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2`
- `cac`: `urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2`
- `cbc`: `urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2`

Fixed identification:
- `CustomizationID`: `urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0`
- `ProfileID`: `urn:fdc:peppol.eu:2017:poacc:billing:01:1.0`

### Norwegian-Specific Rules

1. **Foretaksregisteret**: Companies registered in Foretaksregisteret get a second `PartyTaxScheme` with `CompanyID = "Foretaksregisteret"` and `TaxScheme/ID = "TAX"`. All AS companies are required; ENK may opt in. Controlled by `seller.registeredInForetaksregisteret` boolean.
2. **VAT number**: Format `NO{9-digit-org}MVA`
3. **Endpoint ID**: Scheme `0192` with org number value
4. **KID number**: Placed in `PaymentMeans/PaymentID`

### MVA to UBL Tax Category Mapping

| MVA Rate | UBL Category | Notes |
|----------|-------------|-------|
| 25% | S (Standard) | Standard rate |
| 15% | S (Standard) | Food and drink |
| 12% | S (Standard) | Transport, hotel, cinema |
| 0% (exempt) | E (Exempt) | merverdiavgiftsloven 3-2 to 3-20 |
| 0% (zero-rated) | Z (Zero) | Chapter 6 exports |

Default: 0% maps to `E` (exempt) with `taxExemptionReasonCode` required. Common VATEX codes for Norway:
- `vatex-eu-ae` — reverse charge
- `vatex-eu-d` — intra-community supply
- `vatex-eu-g` — export of goods
- `vatex-eu-ic` — intra-community acquisition

The server action defaults exempt lines to `vatex-eu-ae` (reverse charge) when no specific code is provided. This can be overridden per line in a future UI update.

### Amount Formatting

### Amount Conversion Boundary

All amounts in UBL are decimal with 2 decimal places. The **server action** is the conversion boundary — it converts øre (integer) to NOK (decimal) before passing to the generator. The generator never sees øre.

```ts
// Shared utility in src/lib/xml-utils.ts (extracted from SAF-T pattern)
function oreToDecimal(ore: number): number {
  return ore / 100
}
```

XML output uses `amount.toFixed(2)` for all monetary values. Rounding tolerance for validation: **1 øre (0.01 NOK)** per line item.

### Shared XML Utilities (`src/lib/xml-utils.ts`)

Extract from `saft-generator.ts` and generalize:
- `escapeXml(str)` — shared between SAF-T and EHF generators
- `oreToDecimal(ore)` — shared amount conversion
- `formatDate(date)` — YYYY-MM-DD formatting

The EHF generator uses its own `cbc()`/`cac()` element helpers (different namespace prefixes from SAF-T's `n1:`).

## Validator (`src/lib/ehf-validator.ts`)

### Interface

```ts
type ValidationError = {
  field: string
  message: string
  rule?: string   // Optional reference to PEPPOL/EN16931 rule ID
}

type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

function validateEhfData(data: EhfDocumentData): ValidationResult
```

### Validation Rules

**Required fields:**
- Invoice number non-empty
- Issue date valid YYYY-MM-DD
- At least one line item
- Seller: name, org number, address (city + postal code + country)
- Buyer: name, address (city + postal code + country)

**Format checks:**
- Org number: exactly 9 digits
- VAT number: matches `NO\d{9}MVA` pattern
- Currency: valid ISO 4217 code

**Tax consistency:**
- Each line's taxCategory + taxPercent must be a valid combination
- S category requires percent > 0
- E and Z categories require percent = 0

**Arithmetic checks (tolerance: 0.01 NOK per line):**
- Each line: lineTotal = quantity * unitPrice (within 0.01)
- taxSummary taxableAmount = sum of line totals for that category (within 0.01 * lineCount)
- taxSummary taxAmount = taxableAmount * percent / 100 (within 0.01)
- totals.lineExtensionAmount = sum of all line totals (within 0.01 * lineCount)
- totals.taxInclusiveAmount = taxExclusiveAmount + sum of tax amounts (within 0.01)
- totals.payableAmount = taxInclusiveAmount

**Credit note checks:**
- originalInvoiceRef must be present when type = 'creditNote'

**Warnings (non-blocking):**
- Missing buyer org number (valid but unusual for B2B)
- Missing payment means (invoice won't have bank details)
- Missing KID number
- Missing due date

## Server Action (`src/actions/ehf-export.ts`)

```ts
"use server"

export async function exportEhfXml(invoiceId: string): Promise<{
  xml?: string
  filename?: string
  errors?: ValidationError[]
}>
```

### Flow

1. Call `getCurrentTeam()` for auth
2. Fetch invoice with relations: `{ lines, customer, team, originalInvoice }`
3. Scope query to `teamId`
4. Convert DB model to `EhfDocumentData`:
   - Monetary amounts: ore / 100 for all values
   - Map MVA rates to tax categories
   - Aggregate tax summary by category+rate
   - Build seller from team fields
   - Build buyer from customer fields
   - Build payment means from team bank account + invoice KID
5. Run `validateEhfData(data)`
6. If invalid, return `{ errors }`
7. Generate XML: `generateEhfInvoiceXml(data)` or `generateEhfCreditNoteXml(data)` based on `invoice.invoiceType`
8. Return `{ xml, filename }` where filename = `EHF-{invoiceNumber}-{orgNumber}.xml`

### Data Mapping Details

```ts
// Team -> Seller
seller: {
  name: team.companyName || team.name,
  orgNumber: team.orgNumber,
  vatNumber: team.mvaRegistered ? `NO${team.orgNumber}MVA` : undefined,
  companyType: team.companyType,
  registeredInForetaksregisteret: team.companyType === 'AS', // Default: true for AS
  address: { street: team.address, city: team.city, postalCode: team.postalCode, country: 'NO' },
  bankAccount: team.bankAccount,
}

// Customer -> Buyer
buyer: {
  name: customer.name,
  orgNumber: customer.orgNumber,
  address: { street: customer.address, city: customer.city, postalCode: customer.postalCode, country: 'NO' },
  email: customer.email,
}
```

## API Route for Download

```
GET /api/faktura/[id]/ehf
```

Similar to the existing PDF route. Returns XML with:
- `Content-Type: application/xml`
- `Content-Disposition: attachment; filename="EHF-{number}-{org}.xml"`

## UI Changes

### Invoice Detail Page (`/faktura/[id]`)

Add "Last ned EHF" button next to existing "Last ned PDF" button. Only shown when:
- Invoice status is SENT or PAID (not DRAFT)
- Team has org number configured

Button triggers download via the API route. If validation fails, show errors in a toast/alert.

Include a small link "Valider XML hos peppolvalidator.com" next to the download button so users can verify their XML against the official Schematron rules before sending.

### Credit Note Creation

Add "Opprett kreditnota" button on invoice detail page (for SENT/PAID invoices). This:
1. Creates a new invoice with `invoiceType: CREDIT_NOTE` and `originalInvoiceId` set
2. Pre-fills lines from the original invoice
3. Redirects to the edit form for the credit note

The credit note detail page shows the same EHF download button.

## File Summary

| File | Type | Purpose |
|------|------|---------|
| `src/lib/xml-utils.ts` | New | Shared XML utilities (escapeXml, oreToDecimal, formatDate) |
| `src/lib/ehf-generator.ts` | New | UBL 2.1 XML generation |
| `src/lib/ehf-validator.ts` | New | Pre-flight validation |
| `src/actions/ehf-export.ts` | New | Server action orchestrating export |
| `src/app/api/faktura/[id]/ehf/route.ts` | New | Download API route |
| `prisma/schema.prisma` | Modified | Add InvoiceType enum, credit note fields |
| `src/app/(dashboard)/faktura/[id]/page.tsx` | Modified | Add EHF download + credit note buttons |
| `src/actions/invoices.ts` | Modified | Support credit note creation |
| `src/components/invoice-form.tsx` | Modified | Credit note mode |
| `src/lib/saft-generator.ts` | Modified | Extract shared XML utils to xml-utils.ts |

## Future AP Integration Path

When adding AP integration later, the only changes needed are:
1. New `src/lib/ehf-sender.ts` module that takes XML and submits to AP API
2. New fields on Invoice: `ehfStatus`, `ehfTransmissionId`, `ehfSentAt`
3. `exportEhfXml` action gains a `send: boolean` parameter
4. AP provider credentials stored in team settings

The generator and validator remain unchanged.
