# Bokført — Project Instructions

Norwegian accounting SaaS for freelancers and small businesses (ENK/AS).

## Stack

- **Next.js 16** / **React 19** / App Router — server components and server actions throughout
- **Prisma 7** + PostgreSQL via `@prisma/adapter-pg` (pg adapter, not the default Prisma connection)
- **next-auth v5 beta** — use `auth()` from `@/lib/auth`, never `getServerSession()`
- **Zod v4** — breaking changes from v3: `.flatten()` field errors shape changed, use `.fieldErrors` not `.errors`
- **shadcn/ui** + **Tailwind v4**
- **OpenAI SDK** (`openai` package) — intentional choice, do not suggest switching to Anthropic
- AI client is at `src/lib/ai/client.ts` — use the exported `openai` proxy, never instantiate `new OpenAI()` directly

## Critical Rules

### Multi-tenancy — data isolation is mandatory
Every database query that touches user data **must** be scoped to `teamId`.
Never query invoices, expenses, customers, employees, etc. without a `teamId` where clause.
A missing scope is a data leak between tenants.

```ts
// CORRECT
await db.invoice.findMany({ where: { teamId: team.id } })

// WRONG — leaks all tenants' data
await db.invoice.findMany()
```

### Auth pattern for server actions and pages
Always call `getCurrentTeam()` from `@/lib/auth-utils` at the top of every server action and protected page.
It throws a redirect to `/logg-inn` if unauthenticated, and returns `{ user, team, role }`.

```ts
const { user, team } = await getCurrentTeam()
```

### Money is stored as integers in øre (1 NOK = 100 øre)
Never use floats for monetary amounts. Never divide and store the result without `Math.round()`.
Use the helpers in `src/lib/mva.ts` for all MVA calculations.

```ts
// øre: 10000 = 100 NOK
// CORRECT
const total = Math.round(quantity * unitPrice)

// WRONG
const total = quantity * unitPrice * 1.25  // float arithmetic loses precision
```

### MVA (Norwegian VAT) rates
Valid rates: `0 | 12 | 15 | 25`. These are defined in `src/lib/mva.ts`.
- 25% — standard
- 15% — food and drink
- 12% — transport, hotel, cinema
- 0%  — exempt

### Server actions pattern
All server actions use `"use server"`, validate with Zod, and return typed result objects (not throw).
Return shape: `{ errors?: { fieldName?: string[], _form?: string[] }, success?: boolean }`.

## Key File Locations

| Purpose | Path |
|---------|------|
| DB client | `src/lib/db.ts` |
| Auth config (edge-safe) | `src/auth.config.ts` |
| Auth with Prisma | `src/lib/auth.ts` |
| Session + team helpers | `src/lib/auth-utils.ts` |
| AI client (OpenAI proxy) | `src/lib/ai/client.ts` |
| MVA helpers | `src/lib/mva.ts` |
| KID number generation | `src/lib/kid.ts` |
| Prisma generated client | `src/generated/prisma/` |

## Auth Architecture

Split into two files to support Next.js edge middleware:
- `src/auth.config.ts` — edge-compatible config (no Prisma, no bcrypt)
- `src/lib/auth.ts` — full auth with Prisma + bcrypt, Node.js runtime only

In-memory rate limiter in `auth.ts` resets on server restart — do not treat it as persistent brute-force protection.

## Norwegian Locale Conventions

- UI strings are in Norwegian (Bokmål)
- Dates: `dd.MM.yyyy` format for display
- Company types: `ENK` (enkeltpersonforetak) and `AS` (aksjeselskap)
- Org numbers: 9-digit Norwegian organization numbers
- KID numbers: used for payment identification on invoices

## Database Notes

- Prisma client is generated to `src/generated/prisma/` (not the default location)
- Import from `@/generated/prisma/client`, not `@prisma/client`
- Uses `PrismaPg` adapter — connection pooling handled by the pg adapter
- After schema changes: `npx prisma migrate dev` then `npx prisma generate`
