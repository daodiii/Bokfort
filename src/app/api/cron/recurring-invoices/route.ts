import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateRecurringInvoices } from "@/actions/generate-recurring-invoices"

/**
 * Cron endpoint for generating recurring invoices.
 *
 * Called by Vercel Cron or an external scheduler (e.g. daily at 06:00).
 * Protected by CRON_SECRET to prevent unauthorized access.
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/recurring-invoices",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all teams that have active recurring invoices
  const teams = await db.team.findMany({
    where: {
      recurringInvoices: {
        some: {
          isActive: true,
          nextRunDate: { lte: new Date() },
        },
      },
    },
    select: { id: true, name: true },
  })

  const results: { team: string; generated: number; errors: string[] }[] = []

  for (const team of teams) {
    const result = await generateRecurringInvoices(team.id)
    results.push({
      team: team.name,
      generated: result.generated,
      errors: result.errors,
    })
  }

  const totalGenerated = results.reduce((sum, r) => sum + r.generated, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    totalGenerated,
    totalErrors,
    details: results,
  })
}
