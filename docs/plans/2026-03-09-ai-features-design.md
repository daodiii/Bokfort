# AI Features Design — Bokført

**Date:** 2026-03-09
**Status:** Approved

## Overview

Add 6 AI-powered features to Bokført using OpenAI (GPT-4o for vision, GPT-4o-mini for everything else). All AI responses in Norwegian.

## Architecture

Unified AI service layer at `/src/lib/ai/` with a streaming API route for the chatbot only.

```
/src/lib/ai/
├── client.ts          # OpenAI client singleton
├── ocr.ts             # Receipt scanning (GPT-4o vision)
├── categorize.ts      # Transaction categorization (GPT-4o-mini)
├── reconcile.ts       # Smart bank matching (GPT-4o-mini)
├── chat.ts            # Chatbot with function calling (GPT-4o-mini)
├── anomaly.ts         # Anomaly detection (GPT-4o-mini)
└── invoice.ts         # Smart invoice generation (GPT-4o-mini)

/src/app/api/ai/
└── chat/route.ts      # Streaming chat endpoint

/src/actions/ai.ts     # Server actions for OCR, categorize, reconcile, anomaly
```

**Dependency:** `openai` npm package

**Environment:** `OPENAI_API_KEY` in `.env`

---

## Feature 1: Receipt/Invoice OCR Scanning

**User flow:**
1. User drags image/PDF onto expense creation form
2. File sent to GPT-4o Vision
3. Form fields auto-fill with extracted data
4. User reviews, adjusts, submits normally

**Technical:**
- `lib/ai/ocr.ts` — GPT-4o vision with Norwegian system prompt
- `response_format: { type: "json_object" }` for structured output
- Server action `scanReceipt(formData)` in `actions/ai.ts`
- New `<ReceiptDropZone>` component wrapping expense form
- Supports: JPEG, PNG, PDF (first page)
- File not persisted — processed in memory

**OCR response schema:**
```ts
{
  description: string         // Merchant + purchase description
  amount: number              // Total in NOK (kroner)
  date: string                // YYYY-MM-DD
  mvaRate: 0 | 12 | 15 | 25  // Detected MVA rate
  suggestedCategory: string   // Best-guess category name
  confidence: number          // 0-1
}
```

**Cost:** ~$0.01-0.03 per receipt (GPT-4o vision)

---

## Feature 2: Auto Transaction Categorization

**User flow:**
1. After bank CSV import, AI suggests categories for unmatched transactions
2. On expense form, AI suggests category as user types description
3. User accepts or overrides suggestion

**Technical:**
- `lib/ai/categorize.ts` — sends description + amount + team's categories + last 50 categorized expenses as few-shot examples
- Bulk mode: up to 20 transactions per prompt
- Called from:
  - `actions/bank-import.ts` after `importCsv()`
  - Expense form (debounced on description input)
- New `<CategorySuggestion>` component

**Response schema:**
```ts
{
  categoryId: string
  categoryName: string
  confidence: number    // 0-1
  reasoning: string     // Norwegian
}
```

**Cost:** ~$0.001 per batch of 20 (GPT-4o-mini)

---

## Feature 3: Smart Bank Reconciliation

**User flow:**
1. After CSV import, AI analyzes unmatched transactions vs unlinked expenses/incomes
2. Suggested matches shown with confidence scores
3. User accepts or dismisses each suggestion

**Technical:**
- `lib/ai/reconcile.ts` — two-pass approach:
  1. **Deterministic pre-filter:** candidates by amount match (±2%) and date range (±7 days)
  2. **AI ranking:** GPT-4o-mini ranks filtered candidates with reasoning
- New `<ReconciliationSuggestions>` component on bank import page
- Accept calls existing `matchTransaction()` action
- Only shows confidence > 0.7

**Response schema:**
```ts
{
  matches: Array<{
    transactionId: string
    matchType: "expense" | "income"
    matchId: string
    confidence: number
    reasoning: string     // Norwegian
  }>
}
```

**Cost:** ~$0.002 per batch (GPT-4o-mini)

---

## Feature 4: AI Chatbot

**User flow:**
1. Floating chat bubble in bottom-right corner on all dashboard pages
2. User asks financial questions in Norwegian
3. AI uses function calling to query database, streams response
4. Read-only — cannot create/update/delete data

**Technical:**
- `lib/ai/chat.ts` — system prompt + function definitions
- `/app/api/ai/chat/route.ts` — streaming endpoint
- New `<AiChatBubble>` client component
- Chat history in client state only (not persisted)
- Rate limit: 20 messages/minute/user

**Available functions (all read-only, team-scoped):**
| Function | Description |
|----------|-------------|
| `getIncomes(startDate, endDate)` | Incomes in range |
| `getExpenses(startDate, endDate)` | Expenses in range |
| `getInvoices(status?, startDate?, endDate?)` | Invoices with filters |
| `getProfitAndLoss(startDate, endDate)` | P&L report |
| `getMvaReport(startDate, endDate)` | MVA report |
| `getCustomers()` | Customer list |
| `getBankTransactions(matched?)` | Bank transactions |
| `getExpensesByCategory(startDate, endDate)` | Expenses by category |

**Mitigations:**
- Function results limited to top 20 rows + aggregated totals
- Common queries cached

**Chat UI:**
- Collapsed: small AI icon
- Expanded: 400px panel, message bubbles, markdown support
- Placeholder: "Spør meg om regnskapet ditt..."
- Typing indicator during streaming

**Cost:** ~$0.0005 per message (GPT-4o-mini)

---

## Feature 5: Anomaly Detection

**User flow:**
1. On dashboard load, system checks recent transactions
2. Alert cards shown at top of dashboard
3. User can dismiss or click to investigate

**Anomaly types:**
- Duplicate payments (same amount + similar description within 7 days)
- Unusual amounts (significantly above category average)
- Round number patterns (suspicious round-number expenses)
- Missing receipts (high-value expenses without receipt URLs)
- Date gaps (breaks in usual transaction patterns)

**Technical:**
- `lib/ai/anomaly.ts` — two-step:
  1. **Deterministic pre-scan:** flag obvious patterns (no AI cost)
  2. **AI analysis:** GPT-4o-mini assesses flagged candidates with Norwegian explanations
- Server action `getAnomalies()` in `actions/ai.ts`
- Results cached 24 hours per team (in-memory or simple DB table)
- New `<AnomalyAlerts>` component on dashboard

**Response schema:**
```ts
{
  anomalies: Array<{
    type: "duplicate" | "unusual_amount" | "round_number" | "missing_receipt" | "date_gap"
    severity: "low" | "medium" | "high"
    description: string          // Norwegian
    transactionIds: string[]
    suggestedAction: string      // Norwegian
  }>
}
```

**Dashboard UI:**
- Color-coded: yellow (low), orange (medium), red (high)
- Dismiss stored in localStorage
- Link to flagged transaction

**Cost:** ~$0.003 per daily scan (GPT-4o-mini)

---

## Feature 6: Smart Invoice Generation

**User flow:**
1. User selects a returning customer → AI suggests line items from past invoices
2. User types a brief description → AI generates professional line items
3. User accepts/edits suggestions, submits normally

**Two modes:**
1. **History-based:** Fetch last 3 invoices for customer → suggest similar lines
2. **Description-based:** User types "Webutvikling februar" → AI generates professional lines with quantities, prices, MVA rates

**Technical:**
- `lib/ai/invoice.ts` — takes customer ID + optional description + past invoice data
- Called when user selects customer in invoice form
- New `<InvoiceSuggestions>` component

**Response schema:**
```ts
{
  lines: Array<{
    description: string       // Professional Norwegian description
    quantity: number
    unitPrice: number         // In NOK
    mvaRate: 0 | 12 | 15 | 25
  }>
  notes: string               // Suggested invoice notes
}
```

**Cost:** ~$0.001 per invoice (GPT-4o-mini)

---

## Cost Summary

| Feature | Model | Cost per use |
|---------|-------|-------------|
| OCR scanning | GPT-4o | $0.01-0.03 |
| Transaction categorization | GPT-4o-mini | $0.001 / 20 txns |
| Bank reconciliation | GPT-4o-mini | $0.002 / batch |
| Chatbot | GPT-4o-mini | $0.0005 / message |
| Anomaly detection | GPT-4o-mini | $0.003 / daily scan |
| Smart invoices | GPT-4o-mini | $0.001 / invoice |

**Estimated cost per active user:** ~$0.50-1.00/month

## New Dependencies

- `openai` npm package

## Environment Variables

- `OPENAI_API_KEY` — required for all AI features
