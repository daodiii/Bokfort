# Bokført — Design Document

**Date:** 2026-03-08
**Status:** Approved

## Overview

Bokført is a Norwegian-first accounting and bookkeeping web application targeting solo freelancers (ENK) and small businesses (AS). It provides invoicing, income/expense tracking, CSV bank import, multi-user team access, and basic financial reporting with full Norwegian MVA (VAT) support.

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Language | TypeScript (strict) |
| Database | PostgreSQL + Prisma |
| Auth | NextAuth.js v5 (credentials provider) |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Zod |
| PDF generation | @react-pdf/renderer |
| Date handling | date-fns with `nb` locale |
| Currency formatting | Intl.NumberFormat('nb-NO') |
| Deployment | Docker or Vercel |

## Architecture

Monolith Next.js App Router application. All logic in one repo. Server Components for data fetching, Server Actions for mutations. Prisma ORM for all database access. No separate API layer.

## Project Structure

```
bokfort/
├── src/
│   ├── app/
│   │   ├── (auth)/             # Login, register
│   │   ├── (dashboard)/        # Protected app pages
│   │   │   ├── dashboard/      # Overview
│   │   │   ├── faktura/        # Invoices
│   │   │   ├── utgifter/       # Expenses
│   │   │   ├── inntekter/      # Income
│   │   │   ├── rapporter/      # Reports
│   │   │   ├── kunder/         # Customers
│   │   │   ├── team/           # Team management
│   │   │   ├── bank-import/    # CSV bank import
│   │   │   └── innstillinger/  # Settings
│   │   ├── layout.tsx
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── ...                 # App-specific components
│   ├── lib/
│   │   ├── auth.ts             # NextAuth config
│   │   ├── db.ts               # Prisma client
│   │   ├── mva.ts              # Norwegian VAT logic
│   │   ├── brreg.ts            # Brønnøysundregistrene API client
│   │   ├── csv-parser.ts       # Bank CSV/OCR parser
│   │   └── utils.ts
│   ├── actions/                # Server Actions
│   └── types/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                 # Norwegian categories + chart of accounts
├── public/
└── config files
```

## Data Model

### User
- id, name, email, passwordHash
- companyName, orgNumber
- companyType (ENK | AS)
- address, city, postalCode
- mvaRegistered (boolean)
- bankAccount (for invoice display)
- logoUrl (optional)

### Team / Membership
- Team: id, name, ownerId
- Membership: userId, teamId, role (ADMIN | MEMBER)
- Each user belongs to one team (auto-created on registration)
- Team owner = ADMIN, invited users = MEMBER

### Customer (Kunde)
- id, name, email, phone
- orgNumber (optional)
- address, city, postalCode
- teamId (scoped to team)

### Invoice (Faktura)
- id, invoiceNumber (auto-increment per team)
- status: DRAFT | SENT | PAID | OVERDUE
- customerId, teamId, createdById
- issueDate, dueDate
- currency (default NOK)
- subtotal, mvaAmount, total (stored as integers in øre)
- notes
- InvoiceLines[]

### InvoiceLine
- description, quantity, unitPrice (øre)
- mvaRate (0 | 12 | 15 | 25)
- lineTotal (øre)

### Expense (Utgift)
- id, description, amount (øre)
- mvaAmount (øre), mvaRate
- categoryId, date
- receiptUrl (optional)
- teamId, createdById

### Income (Inntekt)
- id, description, amount (øre)
- source, date
- invoiceId (optional — auto-linked when invoice paid)
- teamId, createdById

### BankTransaction
- id, date, description
- amount (øre), balance (øre)
- matched (boolean) — linked to expense/income
- expenseId / incomeId (optional)
- importBatchId, teamId

### ImportBatch
- id, filename, importedAt
- teamId, importedById

### Category
- id, name, type (INCOME | EXPENSE)
- isDefault (boolean)
- teamId (null for system defaults)

## MVA (VAT) Rates

| Rate | Usage |
|---|---|
| 25% | Standard rate (most goods/services) |
| 15% | Food and beverages |
| 12% | Transport, hotels, cinema |
| 0% | Exempt (healthcare, education, export) |

## Core Features

### Dashboard
- Total income/expenses this month
- Outstanding invoices count + total
- MVA summary for current termin (bi-monthly)
- Recent activity feed

### Faktura (Invoicing)
- Create/edit invoices with line items
- Auto-calculate MVA per line based on rate
- PDF generation with Norwegian formatting (dd.mm.yyyy, 1 234,56 kr)
- Status workflow: Utkast → Sendt → Betalt / Forfalt
- Mark as paid manually
- Auto-create income entry on payment

### Utgifter (Expenses)
- Log expenses with category, amount, MVA rate
- Optional receipt upload
- Predefined Norwegian categories (Kontorutstyr, Reise, Programvare, Telefon, etc.)
- Custom categories

### Inntekter (Income)
- Auto-created when invoice marked as paid
- Manual entries for non-invoice income
- Source tracking

### Kunder (Customers)
- CRUD for customer records
- Brønnøysundregistrene lookup: enter org.nr, auto-fill name + address
- Customer list with search/filter

### Bank Import (CSV)
- Upload CSV/OCR files from Norwegian banks
- Preview parsed transactions before import
- Match transactions to existing expenses/income
- Create new expense/income from unmatched transactions
- Import history

### Team Management
- Auto-create team on user registration
- Invite members by email
- Roles: Admin (full access) / Member (can create, view — cannot delete or manage team)
- All data scoped to team

### Rapporter (Reports)
- Resultatregnskap (Profit & Loss) — period-based
- MVA-oppgave (VAT report) — quarterly summary of incoming/outgoing MVA
- Export to CSV

### Innstillinger (Settings)
- Company info (name, org.nr, address)
- Logo upload
- Bank account number (for invoice display)
- MVA registration toggle
- Invoice number sequence start

## Auth & Security

- NextAuth.js v5 with credentials provider (email + bcrypt password)
- JWT session strategy
- Middleware protects all /dashboard/* routes
- All queries scoped to user's team (teamId filter)
- Server Actions validate input with Zod schemas
- Prisma parameterized queries (SQL injection safe)
- CSRF protection via Server Actions
- Rate limiting on auth endpoints

## Norwegian Formatting

- Dates: dd.mm.yyyy (date-fns with `nb` locale)
- Currency: 1 234,56 kr (Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }))
- Org.nr format: XXX XXX XXX
- UI language: Norwegian (Bokmål)

## Not in MVP (Costs Money)

- Vipps / Stripe payment integrations
- Open Banking (direct bank API connections)
- EHF electronic invoicing (requires PEPPOL access point provider)
