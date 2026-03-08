# Bokført Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Norwegian-first accounting/bookkeeping web app with invoicing, expenses, income tracking, CSV bank import, team access, and MVA reporting.

**Architecture:** Monolith Next.js 15 App Router with Server Components + Server Actions. PostgreSQL via Prisma. NextAuth.js v5 for auth. All data scoped to teams.

**Tech Stack:** Next.js 15, TypeScript (strict), PostgreSQL, Prisma, NextAuth.js v5, Tailwind CSS, shadcn/ui, Zod, @react-pdf/renderer, date-fns

**Design doc:** `docs/plans/2026-03-08-bokfort-design.md`

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Next.js project

**Step 1: Create Next.js app**

Run:
```bash
cd /Users/daodilyas/Desktop/Bokført
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This creates the base Next.js 15 project with TypeScript, Tailwind, ESLint, App Router, and `src/` directory.

**Step 2: Verify it runs**

Run: `npm run dev`
Expected: App starts on http://localhost:3000

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: initialize Next.js 15 project with TypeScript and Tailwind"
```

### Task 2: Install core dependencies

**Step 1: Install production dependencies**

```bash
npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter bcryptjs zod date-fns @react-pdf/renderer
```

**Step 2: Install dev dependencies**

```bash
npm install -D @types/bcryptjs prisma
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install core dependencies (Prisma, NextAuth, Zod, date-fns, react-pdf)"
```

### Task 3: Initialize shadcn/ui

**Step 1: Run shadcn init**

```bash
npx shadcn@latest init
```

Choose: New York style, Zinc base color, CSS variables = yes.

**Step 2: Add essential components**

```bash
npx shadcn@latest add button card input label table dialog dropdown-menu select textarea badge separator sheet tabs avatar form toast sonner
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: initialize shadcn/ui with essential components"
```

### Task 4: Initialize Prisma

**Step 1: Init Prisma with PostgreSQL**

```bash
npx prisma init --datasource-provider postgresql
```

**Step 2: Create `.env` with database URL**

File: `.env`
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bokfort?schema=public"
AUTH_SECRET="generate-a-random-secret-here"
```

Make sure `.env` is in `.gitignore` (create-next-app should have added it).

**Step 3: Commit**

```bash
git add prisma/schema.prisma .env.example
git commit -m "chore: initialize Prisma with PostgreSQL"
```

Note: Create `.env.example` with placeholder values (no secrets).

### Task 5: Configure TypeScript strict mode

**Step 1: Update `tsconfig.json`**

Ensure `strict: true` is set (should already be from create-next-app). Verify by reading the file.

**Step 2: Commit if changes needed**

---

## Phase 2: Database Schema & Seed

### Task 6: Write Prisma schema

**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum CompanyType {
  ENK
  AS
}

enum TeamRole {
  ADMIN
  MEMBER
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
}

enum CategoryType {
  INCOME
  EXPENSE
}

model User {
  id            String       @id @default(cuid())
  name          String
  email         String       @unique
  passwordHash  String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  memberships   Membership[]
  invoices      Invoice[]    @relation("CreatedByUser")
  expenses      Expense[]    @relation("CreatedByUser")
  incomes       Income[]     @relation("CreatedByUser")
  importBatches ImportBatch[] @relation("ImportedByUser")
}

model Team {
  id            String       @id @default(cuid())
  name          String
  companyName   String?
  orgNumber     String?
  companyType   CompanyType  @default(ENK)
  address       String?
  city          String?
  postalCode    String?
  mvaRegistered Boolean      @default(false)
  bankAccount   String?
  logoUrl       String?
  invoiceNumberSeq Int       @default(1)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  memberships   Membership[]
  customers     Customer[]
  invoices      Invoice[]
  expenses      Expense[]
  incomes       Income[]
  categories    Category[]
  bankTransactions BankTransaction[]
  importBatches ImportBatch[]
}

model Membership {
  id      String   @id @default(cuid())
  userId  String
  teamId  String
  role    TeamRole @default(MEMBER)

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  team    Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([userId, teamId])
}

model Customer {
  id         String   @id @default(cuid())
  name       String
  email      String?
  phone      String?
  orgNumber  String?
  address    String?
  city       String?
  postalCode String?
  teamId     String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  team       Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  invoices   Invoice[]
}

model Invoice {
  id            String        @id @default(cuid())
  invoiceNumber Int
  status        InvoiceStatus @default(DRAFT)
  customerId    String
  teamId        String
  createdById   String
  issueDate     DateTime      @default(now())
  dueDate       DateTime
  currency      String        @default("NOK")
  subtotal      Int           @default(0)  // øre
  mvaAmount     Int           @default(0)  // øre
  total         Int           @default(0)  // øre
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  customer      Customer      @relation(fields: [customerId], references: [id])
  team          Team          @relation(fields: [teamId], references: [id], onDelete: Cascade)
  createdBy     User          @relation("CreatedByUser", fields: [createdById], references: [id])
  lines         InvoiceLine[]
  income        Income?
}

model InvoiceLine {
  id          String  @id @default(cuid())
  invoiceId   String
  description String
  quantity    Int     @default(1)
  unitPrice   Int     // øre
  mvaRate     Int     @default(25) // 0, 12, 15, 25
  lineTotal   Int     // øre (quantity * unitPrice)
  mvaAmount   Int     // øre (lineTotal * mvaRate / 100)

  invoice     Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}

model Expense {
  id          String   @id @default(cuid())
  description String
  amount      Int      // øre
  mvaAmount   Int      @default(0) // øre
  mvaRate     Int      @default(25)
  categoryId  String?
  date        DateTime
  receiptUrl  String?
  teamId      String
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category    Category? @relation(fields: [categoryId], references: [id])
  team        Team      @relation(fields: [teamId], references: [id], onDelete: Cascade)
  createdBy   User      @relation("CreatedByUser", fields: [createdById], references: [id])
  bankTransaction BankTransaction?
}

model Income {
  id          String   @id @default(cuid())
  description String
  amount      Int      // øre
  source      String?
  date        DateTime
  invoiceId   String?  @unique
  teamId      String
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  invoice     Invoice?  @relation(fields: [invoiceId], references: [id])
  team        Team      @relation(fields: [teamId], references: [id], onDelete: Cascade)
  createdBy   User      @relation("CreatedByUser", fields: [createdById], references: [id])
  bankTransaction BankTransaction?
}

model BankTransaction {
  id            String   @id @default(cuid())
  date          DateTime
  description   String
  amount        Int      // øre (positive = income, negative = expense)
  balance       Int?     // øre
  matched       Boolean  @default(false)
  expenseId     String?  @unique
  incomeId      String?  @unique
  importBatchId String
  teamId        String
  createdAt     DateTime @default(now())

  expense       Expense?     @relation(fields: [expenseId], references: [id])
  income        Income?      @relation(fields: [incomeId], references: [id])
  importBatch   ImportBatch  @relation(fields: [importBatchId], references: [id], onDelete: Cascade)
  team          Team         @relation(fields: [teamId], references: [id], onDelete: Cascade)
}

model ImportBatch {
  id           String   @id @default(cuid())
  filename     String
  importedAt   DateTime @default(now())
  teamId       String
  importedById String

  team         Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  importedBy   User     @relation("ImportedByUser", fields: [importedById], references: [id])
  transactions BankTransaction[]
}

model Category {
  id        String       @id @default(cuid())
  name      String
  type      CategoryType
  isDefault Boolean      @default(false)
  teamId    String?

  team      Team?    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  expenses  Expense[]
}
```

**Step 1: Write the schema above to `prisma/schema.prisma`**

**Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add complete Prisma schema with all models"
```

### Task 7: Create Prisma client singleton

**File:** Create `src/lib/db.ts`

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

**Commit:**
```bash
git add src/lib/db.ts
git commit -m "feat: add Prisma client singleton"
```

### Task 8: Write seed script with Norwegian categories

**File:** Create `prisma/seed.ts`

```typescript
import { PrismaClient, CategoryType } from "@prisma/client"

const prisma = new PrismaClient()

const defaultCategories = [
  // Expense categories
  { name: "Kontorutstyr", type: CategoryType.EXPENSE },
  { name: "Programvare", type: CategoryType.EXPENSE },
  { name: "Reise", type: CategoryType.EXPENSE },
  { name: "Transport", type: CategoryType.EXPENSE },
  { name: "Telefon og internett", type: CategoryType.EXPENSE },
  { name: "Forsikring", type: CategoryType.EXPENSE },
  { name: "Husleie", type: CategoryType.EXPENSE },
  { name: "Regnskap og revisjon", type: CategoryType.EXPENSE },
  { name: "Markedsføring", type: CategoryType.EXPENSE },
  { name: "Kurs og opplæring", type: CategoryType.EXPENSE },
  { name: "Kontorrekvisita", type: CategoryType.EXPENSE },
  { name: "Representasjon", type: CategoryType.EXPENSE },
  { name: "Vedlikehold", type: CategoryType.EXPENSE },
  { name: "Annet", type: CategoryType.EXPENSE },
  // Income categories
  { name: "Salg av varer", type: CategoryType.INCOME },
  { name: "Salg av tjenester", type: CategoryType.INCOME },
  { name: "Konsulenthonorar", type: CategoryType.INCOME },
  { name: "Renteinntekter", type: CategoryType.INCOME },
  { name: "Annen inntekt", type: CategoryType.INCOME },
]

async function main() {
  console.log("Seeding default categories...")

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { id: `default-${cat.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `default-${cat.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: cat.name,
        type: cat.type,
        isDefault: true,
        teamId: null,
      },
    })
  }

  console.log("Seeding complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Step 1: Write seed file**

**Step 2: Add seed command to `package.json`**

Add to `package.json`:
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

**Step 3: Install tsx**

```bash
npm install -D tsx
```

**Step 4: Run seed**

```bash
npx prisma db seed
```

**Step 5: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: add seed script with default Norwegian categories"
```

---

## Phase 3: Auth

### Task 9: Configure NextAuth.js v5

**File:** Create `src/lib/auth.ts`

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/logg-inn",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-post", type: "email" },
        password: { label: "Passord", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        )
        if (!passwordMatch) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
```

**File:** Create `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```

**File:** Create `src/middleware.ts`

```typescript
import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/logg-inn") ||
    req.nextUrl.pathname.startsWith("/registrer")
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/faktura") ||
    req.nextUrl.pathname.startsWith("/utgifter") ||
    req.nextUrl.pathname.startsWith("/inntekter") ||
    req.nextUrl.pathname.startsWith("/rapporter") ||
    req.nextUrl.pathname.startsWith("/kunder") ||
    req.nextUrl.pathname.startsWith("/team") ||
    req.nextUrl.pathname.startsWith("/bank-import") ||
    req.nextUrl.pathname.startsWith("/innstillinger")

  if (isDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/logg-inn", req.nextUrl))
  }

  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

**File:** Create `src/types/next-auth.d.ts`

```typescript
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}
```

**Commit:**
```bash
git add src/lib/auth.ts src/app/api/auth/ src/middleware.ts src/types/
git commit -m "feat: configure NextAuth.js v5 with credentials provider and middleware"
```

### Task 10: Build registration server action

**File:** Create `src/actions/auth.ts`

```typescript
"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { signIn } from "@/lib/auth"

const registerSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(8, "Passord må være minst 8 tegn"),
  companyName: z.string().min(1, "Firmanavn er påkrevd"),
  orgNumber: z.string().optional(),
  companyType: z.enum(["ENK", "AS"]),
})

export type RegisterInput = z.infer<typeof registerSchema>

export async function register(input: RegisterInput) {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  })
  if (existing) {
    return { error: { email: ["E-postadressen er allerede i bruk"] } }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  })

  // Auto-create team and admin membership
  const team = await db.team.create({
    data: {
      name: parsed.data.companyName,
      companyName: parsed.data.companyName,
      orgNumber: parsed.data.orgNumber || null,
      companyType: parsed.data.companyType,
      memberships: {
        create: {
          userId: user.id,
          role: "ADMIN",
        },
      },
    },
  })

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  })

  return { success: true }
}
```

**Commit:**
```bash
git add src/actions/auth.ts
git commit -m "feat: add registration server action with team auto-creation"
```

### Task 11: Build auth pages (login + register)

**File:** Create `src/app/(auth)/logg-inn/page.tsx` — Login form with email/password, link to register.

**File:** Create `src/app/(auth)/registrer/page.tsx` — Registration form with name, email, password, company name, org number, company type (ENK/AS).

**File:** Create `src/app/(auth)/layout.tsx` — Centered layout with Bokført branding.

Both pages use shadcn/ui `Card`, `Input`, `Label`, `Button`, `Select` components. Forms use React `useActionState` or `useFormStatus` for pending states.

**Commit:**
```bash
git add src/app/\(auth\)/
git commit -m "feat: add login and registration pages"
```

---

## Phase 4: Utility Libraries

### Task 12: Norwegian formatting utilities

**File:** Create `src/lib/utils.ts` (extend existing)

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { nb } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format øre amount to Norwegian currency string: 1 234,56 kr */
export function formatCurrency(ore: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 2,
  }).format(ore / 100)
}

/** Format date to Norwegian format: dd.mm.yyyy */
export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd.MM.yyyy", { locale: nb })
}

/** Format org number: XXX XXX XXX */
export function formatOrgNumber(orgNr: string): string {
  const digits = orgNr.replace(/\s/g, "")
  if (digits.length !== 9) return orgNr
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
}

/** Convert kroner to øre */
export function kronerToOre(kroner: number): number {
  return Math.round(kroner * 100)
}

/** Convert øre to kroner */
export function oreToKroner(ore: number): number {
  return ore / 100
}
```

**Commit:**
```bash
git add src/lib/utils.ts
git commit -m "feat: add Norwegian formatting utilities (currency, date, org number)"
```

### Task 13: MVA (VAT) utility

**File:** Create `src/lib/mva.ts`

```typescript
export const MVA_RATES = [
  { rate: 25, label: "25% – Standard" },
  { rate: 15, label: "15% – Mat og drikke" },
  { rate: 12, label: "12% – Transport, hotell, kino" },
  { rate: 0, label: "0% – Fritatt" },
] as const

export type MvaRate = 0 | 12 | 15 | 25

/** Calculate MVA amount from a net amount in øre */
export function calculateMva(netAmountOre: number, rate: MvaRate): number {
  return Math.round(netAmountOre * rate / 100)
}

/** Calculate gross amount (net + MVA) in øre */
export function calculateGross(netAmountOre: number, rate: MvaRate): number {
  return netAmountOre + calculateMva(netAmountOre, rate)
}

/** Extract net amount from a gross amount in øre */
export function extractNet(grossAmountOre: number, rate: MvaRate): number {
  return Math.round(grossAmountOre / (1 + rate / 100))
}
```

**Commit:**
```bash
git add src/lib/mva.ts
git commit -m "feat: add MVA (VAT) calculation utilities"
```

### Task 14: Brønnøysundregistrene API client

**File:** Create `src/lib/brreg.ts`

```typescript
import { z } from "zod"

const brregResponseSchema = z.object({
  navn: z.string(),
  organisasjonsnummer: z.string(),
  forretningsadresse: z.object({
    adresse: z.array(z.string()).optional(),
    postnummer: z.string().optional(),
    poststed: z.string().optional(),
  }).optional(),
})

export type BrregCompany = {
  name: string
  orgNumber: string
  address: string | null
  postalCode: string | null
  city: string | null
}

export async function lookupCompany(orgNumber: string): Promise<BrregCompany | null> {
  const digits = orgNumber.replace(/\s/g, "")
  if (digits.length !== 9) return null

  try {
    const res = await fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter/${digits}`,
      { next: { revalidate: 86400 } } // cache 24h
    )
    if (!res.ok) return null

    const data = brregResponseSchema.parse(await res.json())

    return {
      name: data.navn,
      orgNumber: data.organisasjonsnummer,
      address: data.forretningsadresse?.adresse?.join(", ") ?? null,
      postalCode: data.forretningsadresse?.postnummer ?? null,
      city: data.forretningsadresse?.poststed ?? null,
    }
  } catch {
    return null
  }
}
```

**Commit:**
```bash
git add src/lib/brreg.ts
git commit -m "feat: add Brønnøysundregistrene API client for company lookup"
```

### Task 15: CSV bank parser

**File:** Create `src/lib/csv-parser.ts`

```typescript
export type ParsedTransaction = {
  date: Date
  description: string
  amount: number // øre (positive = deposit, negative = withdrawal)
  balance: number | null // øre
}

/**
 * Parse Norwegian bank CSV. Common formats:
 * - DNB: Dato;Forklaring;Rentedato;Ut av konto;Inn på konto
 * - Nordea: Bokført dato;Tekst;Beløp;Saldo
 * - SpareBank 1: Dato;Innbetaling;Utbetaling;Tekst;Saldo
 *
 * This parser attempts to auto-detect the format from headers.
 */
export function parseBankCsv(csvContent: string): ParsedTransaction[] {
  const lines = csvContent.trim().split("\n")
  if (lines.length < 2) return []

  const separator = lines[0].includes(";") ? ";" : ","
  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase().replace(/"/g, ""))

  const transactions: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(separator).map((c) => c.trim().replace(/"/g, ""))
    if (cols.length < 2) continue

    const tx = parseRow(headers, cols)
    if (tx) transactions.push(tx)
  }

  return transactions
}

function parseRow(headers: string[], cols: string[]): ParsedTransaction | null {
  try {
    // Try to find date column
    const dateIdx = headers.findIndex((h) =>
      h.includes("dato") || h.includes("date") || h === "bokført"
    )
    // Try to find description
    const descIdx = headers.findIndex((h) =>
      h.includes("tekst") || h.includes("forklaring") || h.includes("beskrivelse") || h.includes("description")
    )
    // Try to find amount
    const amountIdx = headers.findIndex((h) =>
      h.includes("beløp") || h.includes("amount")
    )
    // Try separate in/out columns
    const inIdx = headers.findIndex((h) =>
      h.includes("inn") || h.includes("innbetaling") || h.includes("innskudd")
    )
    const outIdx = headers.findIndex((h) =>
      h.includes("ut") || h.includes("utbetaling") || h.includes("uttak")
    )
    const balanceIdx = headers.findIndex((h) =>
      h.includes("saldo") || h.includes("balance")
    )

    if (dateIdx === -1 || descIdx === -1) return null

    const date = parseNorwegianDate(cols[dateIdx])
    if (!date) return null

    const description = cols[descIdx]

    let amountOre: number
    if (amountIdx !== -1) {
      amountOre = parseNorwegianNumber(cols[amountIdx])
    } else if (inIdx !== -1 && outIdx !== -1) {
      const inAmount = cols[inIdx] ? parseNorwegianNumber(cols[inIdx]) : 0
      const outAmount = cols[outIdx] ? parseNorwegianNumber(cols[outIdx]) : 0
      amountOre = inAmount > 0 ? inAmount : -outAmount
    } else {
      return null
    }

    const balance = balanceIdx !== -1 && cols[balanceIdx]
      ? parseNorwegianNumber(cols[balanceIdx])
      : null

    return { date, description, amount: amountOre, balance }
  } catch {
    return null
  }
}

/** Parse Norwegian number format: "1 234,56" or "-1234.56" → øre */
function parseNorwegianNumber(str: string): number {
  const cleaned = str.replace(/\s/g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

/** Parse Norwegian date: dd.mm.yyyy or yyyy-mm-dd */
function parseNorwegianDate(str: string): Date | null {
  // dd.mm.yyyy
  const dotMatch = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dotMatch) {
    return new Date(+dotMatch[3], +dotMatch[2] - 1, +dotMatch[1])
  }
  // yyyy-mm-dd
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3])
  }
  return null
}
```

**Commit:**
```bash
git add src/lib/csv-parser.ts
git commit -m "feat: add bank CSV parser with Norwegian format auto-detection"
```

### Task 16: Auth helper to get current user and team

**File:** Create `src/lib/auth-utils.ts`

```typescript
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) redirect("/logg-inn")
  return session.user
}

export async function getCurrentTeam() {
  const user = await getCurrentUser()

  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { team: true },
  })

  if (!membership) redirect("/logg-inn")

  return {
    user,
    team: membership.team,
    role: membership.role,
  }
}
```

**Commit:**
```bash
git add src/lib/auth-utils.ts
git commit -m "feat: add auth helpers for getting current user and team"
```

---

## Phase 5: Dashboard Layout & Navigation

### Task 17: Build dashboard layout with sidebar

**File:** Create `src/app/(dashboard)/layout.tsx` — Dashboard shell with:
- Sidebar with Bokført logo, navigation links (Dashboard, Faktura, Utgifter, Inntekter, Kunder, Bank-import, Rapporter, Team, Innstillinger)
- User menu (dropdown with name, email, sign out)
- Mobile-responsive (sheet-based sidebar on mobile)
- Uses shadcn/ui `Sheet`, `Button`, `Avatar`, `DropdownMenu`, `Separator`

**File:** Create `src/components/sidebar-nav.tsx` — Navigation component with Norwegian labels and icons.

**File:** Create `src/components/user-menu.tsx` — User dropdown with sign out action.

**Commit:**
```bash
git add src/app/\(dashboard\)/layout.tsx src/components/
git commit -m "feat: add dashboard layout with sidebar navigation"
```

### Task 18: Build dashboard overview page

**File:** Create `src/app/(dashboard)/dashboard/page.tsx`

Server Component that fetches:
- Total income this month (from Income model)
- Total expenses this month (from Expense model)
- Outstanding invoices (status SENT or OVERDUE, sum total)
- MVA summary for current termin
- Recent 10 activities (latest invoices, expenses, incomes)

Display in a card grid using shadcn/ui `Card` components with `formatCurrency()` and `formatDate()`.

**Commit:**
```bash
git add src/app/\(dashboard\)/dashboard/
git commit -m "feat: add dashboard overview page with summary cards"
```

---

## Phase 6: Customer Management

### Task 19: Customer server actions

**File:** Create `src/actions/customers.ts`

Server actions: `createCustomer`, `updateCustomer`, `deleteCustomer`, `lookupBrreg`

All actions:
- Get current team via `getCurrentTeam()`
- Validate input with Zod
- Scope queries to `teamId`
- `lookupBrreg` calls `lookupCompany()` from `src/lib/brreg.ts`
- Revalidate path after mutations

**Commit:**
```bash
git add src/actions/customers.ts
git commit -m "feat: add customer CRUD server actions with Brreg lookup"
```

### Task 20: Customer list and form pages

**File:** Create `src/app/(dashboard)/kunder/page.tsx` — List all customers with search, link to create new.

**File:** Create `src/app/(dashboard)/kunder/ny/page.tsx` — Create customer form with org.nr lookup button.

**File:** Create `src/app/(dashboard)/kunder/[id]/page.tsx` — View/edit customer, list their invoices.

**File:** Create `src/components/customer-form.tsx` — Shared form component with Brreg auto-fill.

**Commit:**
```bash
git add src/app/\(dashboard\)/kunder/ src/components/customer-form.tsx
git commit -m "feat: add customer management pages with Brreg auto-fill"
```

---

## Phase 7: Invoicing

### Task 21: Invoice server actions

**File:** Create `src/actions/invoices.ts`

Server actions: `createInvoice`, `updateInvoice`, `deleteInvoice`, `updateInvoiceStatus`, `markAsPaid`

Key logic:
- `createInvoice`: Auto-increment `invoiceNumber` from `team.invoiceNumberSeq`, update team seq
- `updateInvoiceStatus`: Handle status transitions
- `markAsPaid`: Set status to PAID + auto-create Income entry linked to invoice
- All scoped to teamId
- Line item calculations: `lineTotal = quantity * unitPrice`, `mvaAmount = lineTotal * mvaRate / 100`
- Invoice totals: sum of all line totals, sum of all line MVA amounts

**Commit:**
```bash
git add src/actions/invoices.ts
git commit -m "feat: add invoice server actions with auto-numbering and MVA calculation"
```

### Task 22: Invoice pages

**File:** Create `src/app/(dashboard)/faktura/page.tsx` — List invoices with status badges, filters (all/draft/sent/paid/overdue).

**File:** Create `src/app/(dashboard)/faktura/ny/page.tsx` — Create invoice: select customer, add line items, auto-calc MVA. Dynamic form with add/remove lines.

**File:** Create `src/app/(dashboard)/faktura/[id]/page.tsx` — View invoice detail, status actions (send, mark paid), link to PDF.

**File:** Create `src/components/invoice-form.tsx` — Shared form with dynamic line items, MVA rate selector per line, running totals.

**File:** Create `src/components/invoice-status-badge.tsx` — Status badge component (Utkast, Sendt, Betalt, Forfalt).

**Commit:**
```bash
git add src/app/\(dashboard\)/faktura/ src/components/invoice-form.tsx src/components/invoice-status-badge.tsx
git commit -m "feat: add invoice pages with dynamic line items and MVA calculation"
```

### Task 23: Invoice PDF generation

**File:** Create `src/components/invoice-pdf.tsx`

React-PDF document with:
- Company header (name, org.nr, address, logo, bank account)
- Customer info
- Invoice number, date, due date
- Line items table with description, quantity, unit price, MVA rate, line total
- Subtotal, MVA summary (grouped by rate), Grand total
- Norwegian formatting throughout

**File:** Create `src/app/api/faktura/[id]/pdf/route.ts` — API route that renders PDF and returns it as `application/pdf`.

**Commit:**
```bash
git add src/components/invoice-pdf.tsx src/app/api/faktura/
git commit -m "feat: add invoice PDF generation with Norwegian formatting"
```

---

## Phase 8: Expenses

### Task 24: Expense server actions

**File:** Create `src/actions/expenses.ts`

Server actions: `createExpense`, `updateExpense`, `deleteExpense`

- Validate with Zod
- Amount input in kroner, convert to øre with `kronerToOre()`
- Auto-calculate MVA amount from gross amount and rate using `extractNet()` + `calculateMva()`
- Scope to teamId

**Commit:**
```bash
git add src/actions/expenses.ts
git commit -m "feat: add expense CRUD server actions"
```

### Task 25: Expense pages

**File:** Create `src/app/(dashboard)/utgifter/page.tsx` — List expenses with category filter, date range, totals.

**File:** Create `src/app/(dashboard)/utgifter/ny/page.tsx` — Create expense form with category select, MVA rate, optional receipt upload.

**File:** Create `src/app/(dashboard)/utgifter/[id]/page.tsx` — View/edit expense.

**File:** Create `src/components/expense-form.tsx` — Shared expense form.

**Commit:**
```bash
git add src/app/\(dashboard\)/utgifter/ src/components/expense-form.tsx
git commit -m "feat: add expense management pages"
```

---

## Phase 9: Income

### Task 26: Income server actions

**File:** Create `src/actions/incomes.ts`

Server actions: `createIncome`, `updateIncome`, `deleteIncome`

- Similar pattern to expenses
- Don't allow deleting income auto-created from invoices (has invoiceId)

**Commit:**
```bash
git add src/actions/incomes.ts
git commit -m "feat: add income CRUD server actions"
```

### Task 27: Income pages

**File:** Create `src/app/(dashboard)/inntekter/page.tsx` — List incomes, show which are invoice-linked.

**File:** Create `src/app/(dashboard)/inntekter/ny/page.tsx` — Create manual income.

**File:** Create `src/components/income-form.tsx` — Shared income form.

**Commit:**
```bash
git add src/app/\(dashboard\)/inntekter/ src/components/income-form.tsx
git commit -m "feat: add income management pages"
```

---

## Phase 10: Bank Import

### Task 28: Bank import server actions

**File:** Create `src/actions/bank-import.ts`

Server actions:
- `importCsv(formData: FormData)`: Parse CSV file, create ImportBatch + BankTransactions
- `matchTransaction(transactionId, type: "expense" | "income", targetId)`: Link transaction to existing expense/income
- `createFromTransaction(transactionId, type, categoryId?)`: Create new expense/income from transaction

**Commit:**
```bash
git add src/actions/bank-import.ts
git commit -m "feat: add bank CSV import server actions"
```

### Task 29: Bank import pages

**File:** Create `src/app/(dashboard)/bank-import/page.tsx` — Upload CSV, show import history.

**File:** Create `src/app/(dashboard)/bank-import/[batchId]/page.tsx` — Review imported transactions, match/create for each.

**File:** Create `src/components/transaction-matcher.tsx` — Component to match a transaction to existing records or create new.

**Commit:**
```bash
git add src/app/\(dashboard\)/bank-import/ src/components/transaction-matcher.tsx
git commit -m "feat: add bank CSV import pages with transaction matching"
```

---

## Phase 11: Team Management

### Task 30: Team server actions

**File:** Create `src/actions/team.ts`

Server actions:
- `inviteMember(email)`: Create user placeholder + membership (MEMBER role). In MVP, invited user must register with that email.
- `removeMember(membershipId)`: Remove team member (admin only)
- `updateMemberRole(membershipId, role)`: Change role (admin only)
- `updateTeamSettings(data)`: Update company info

**Commit:**
```bash
git add src/actions/team.ts
git commit -m "feat: add team management server actions"
```

### Task 31: Team management page

**File:** Create `src/app/(dashboard)/team/page.tsx` — List team members, invite new, manage roles. Admin-only actions hidden for MEMBER role.

**Commit:**
```bash
git add src/app/\(dashboard\)/team/
git commit -m "feat: add team management page"
```

---

## Phase 12: Reports

### Task 32: Report server actions / queries

**File:** Create `src/actions/reports.ts`

Functions (not server actions, just data fetchers):
- `getProfitAndLoss(teamId, startDate, endDate)`: Query incomes and expenses, group by category, return totals
- `getMvaReport(teamId, startDate, endDate)`: Calculate outgoing MVA (from invoices) and incoming MVA (from expenses), net MVA payable
- `exportToCsv(data, type)`: Generate CSV string for download

**Commit:**
```bash
git add src/actions/reports.ts
git commit -m "feat: add report data queries (P&L, MVA)"
```

### Task 33: Report pages

**File:** Create `src/app/(dashboard)/rapporter/page.tsx` — Report selector with date range picker.

**File:** Create `src/app/(dashboard)/rapporter/resultat/page.tsx` — Resultatregnskap (P&L) with income/expense breakdown by category.

**File:** Create `src/app/(dashboard)/rapporter/mva/page.tsx` — MVA-oppgave with outgoing/incoming/net MVA, grouped by rate.

Both pages include CSV export button.

**Commit:**
```bash
git add src/app/\(dashboard\)/rapporter/
git commit -m "feat: add report pages (Resultatregnskap, MVA-oppgave)"
```

---

## Phase 13: Settings

### Task 34: Settings page

**File:** Create `src/app/(dashboard)/innstillinger/page.tsx`

Tabs with:
- **Firma**: Company name, org.nr, address, city, postal code, company type
- **Faktura**: Bank account number, logo upload, invoice number start
- **MVA**: Toggle MVA registration

Uses `updateTeamSettings` action from Task 30.

**Commit:**
```bash
git add src/app/\(dashboard\)/innstillinger/
git commit -m "feat: add settings page with company, invoice, and MVA tabs"
```

---

## Phase 14: Landing Page & Polish

### Task 35: Landing page

**File:** Update `src/app/page.tsx`

Simple landing page with:
- Bokført hero section with tagline ("Enkel bokføring for norske bedrifter")
- Feature highlights (3-4 cards)
- CTA buttons to register/login
- Norwegian language throughout

**Commit:**
```bash
git add src/app/page.tsx
git commit -m "feat: add Norwegian landing page"
```

### Task 36: Create `.env.example`

**File:** Create `.env.example`

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bokfort?schema=public"
AUTH_SECRET="your-secret-here"
```

**Commit:**
```bash
git add .env.example
git commit -m "chore: add .env.example"
```

### Task 37: Final verification

**Step 1:** Run `npm run build` — verify no TypeScript errors
**Step 2:** Run `npx prisma migrate dev` — verify schema is valid
**Step 3:** Run `npm run dev` — verify app starts and pages load
**Step 4:** Test registration → login → dashboard flow manually

**Commit any fixes.**
