"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

// ── Schemas ──────────────────────────────────────────────────────────

const timeEntrySchema = z.object({
  description: z.string().optional(),
  date: z.string().min(1, "Dato er påkrevd"),
  hours: z
    .number({ message: "Timer må være et tall" })
    .positive("Timer må være større enn 0")
    .max(24, "Maks 24 timer per registrering"),
  projectId: z.string().min(1, "Velg et prosjekt"),
  billable: z.boolean().default(true),
  hourlyRate: z.number().nullable().optional(),
})

export type TimeEntryState = {
  errors?: {
    description?: string[]
    date?: string[]
    hours?: string[]
    projectId?: string[]
    billable?: string[]
    hourlyRate?: string[]
    _form?: string[]
  }
  success?: boolean
}

// ── Queries ──────────────────────────────────────────────────────────

export async function getProjects() {
  const { team } = await getCurrentTeam()

  return db.project.findMany({
    where: { teamId: team.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  })
}

export async function getTimeEntries(filters?: {
  from?: Date
  to?: Date
  projectId?: string
}) {
  const { team, user } = await getCurrentTeam()

  const where: Record<string, unknown> = {
    userId: user.id,
    project: { teamId: team.id },
  }

  if (filters?.from || filters?.to) {
    where.date = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    }
  }

  if (filters?.projectId) {
    where.projectId = filters.projectId
  }

  return db.timeEntry.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: "desc" },
  })
}

export async function getWeeklySummary(weekOffset: number = 0) {
  const { team, user } = await getCurrentTeam()

  // Calculate the Monday of the target week
  const now = new Date()
  const currentDay = now.getDay()
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay

  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const entries = await db.timeEntry.findMany({
    where: {
      userId: user.id,
      project: { teamId: team.id },
      date: { gte: monday, lte: sunday },
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: "asc" },
  })

  // Group by day of week (0=Monday, 6=Sunday)
  const days: {
    date: Date
    dayName: string
    dayShort: string
    entries: typeof entries
    totalHours: number
  }[] = []

  const dayNames = [
    "Mandag",
    "Tirsdag",
    "Onsdag",
    "Torsdag",
    "Fredag",
    "Lørdag",
    "Søndag",
  ]
  const dayShorts = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"]

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday)
    dayDate.setDate(monday.getDate() + i)

    const dayEntries = entries.filter((e) => {
      const d = new Date(e.date)
      return d.toDateString() === dayDate.toDateString()
    })

    days.push({
      date: dayDate,
      dayName: dayNames[i],
      dayShort: dayShorts[i],
      entries: dayEntries,
      totalHours: dayEntries.reduce((sum, e) => sum + e.hours, 0),
    })
  }

  return {
    weekStart: monday,
    weekEnd: sunday,
    days,
    totalHours: entries.reduce((sum, e) => sum + e.hours, 0),
    entries,
  }
}

export async function getTimeStats() {
  const { team, user } = await getCurrentTeam()

  const now = new Date()

  // This week (Monday to Sunday)
  const currentDay = now.getDay()
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + diffToMonday)
  weekStart.setHours(0, 0, 0, 0)

  // This month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const [weekEntries, monthEntries] = await Promise.all([
    db.timeEntry.findMany({
      where: {
        userId: user.id,
        project: { teamId: team.id },
        date: { gte: weekStart },
      },
      select: { hours: true, billable: true, hourlyRate: true },
    }),
    db.timeEntry.findMany({
      where: {
        userId: user.id,
        project: { teamId: team.id },
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { hours: true, billable: true, hourlyRate: true },
    }),
  ])

  const weekHours = weekEntries.reduce((s, e) => s + e.hours, 0)
  const monthHours = monthEntries.reduce((s, e) => s + e.hours, 0)

  const billableMonth = monthEntries.filter((e) => e.billable)
  const billableHours = billableMonth.reduce((s, e) => s + e.hours, 0)
  const billablePct = monthHours > 0 ? Math.round((billableHours / monthHours) * 100) : 0

  // Estimated value: sum of (hours * hourlyRate) for billable entries
  const estimatedValueOre = monthEntries
    .filter((e) => e.billable && e.hourlyRate)
    .reduce((s, e) => s + e.hours * (e.hourlyRate ?? 0), 0)

  return {
    weekHours,
    monthHours,
    billablePct,
    estimatedValueOre,
  }
}

// ── Mutations ────────────────────────────────────────────────────────

export async function createTimeEntry(
  _prevState: TimeEntryState,
  formData: FormData
): Promise<TimeEntryState> {
  const rawData = {
    description: (formData.get("description") as string) || undefined,
    date: formData.get("date") as string,
    hours: Number(formData.get("hours")),
    projectId: formData.get("projectId") as string,
    billable: formData.get("billable") === "true",
    hourlyRate: formData.get("hourlyRate")
      ? Number(formData.get("hourlyRate"))
      : null,
  }

  const parsed = timeEntrySchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as TimeEntryState["errors"],
    }
  }

  try {
    const { user, team } = await getCurrentTeam()

    // Verify project belongs to team
    const project = await db.project.findFirst({
      where: { id: parsed.data.projectId, teamId: team.id },
    })

    if (!project) {
      return { errors: { _form: ["Prosjektet ble ikke funnet."] } }
    }

    await db.timeEntry.create({
      data: {
        description: parsed.data.description || null,
        date: new Date(parsed.data.date),
        hours: parsed.data.hours,
        projectId: parsed.data.projectId,
        userId: user.id,
        billable: parsed.data.billable,
        hourlyRate: parsed.data.hourlyRate
          ? Math.round(parsed.data.hourlyRate * 100) // convert kr to øre
          : null,
      },
    })

    revalidatePath("/timer")
    return { success: true }
  } catch {
    return {
      errors: { _form: ["Noe gikk galt. Vennligst prøv igjen."] },
    }
  }
}

export async function updateTimeEntry(
  id: string,
  _prevState: TimeEntryState,
  formData: FormData
): Promise<TimeEntryState> {
  const rawData = {
    description: (formData.get("description") as string) || undefined,
    date: formData.get("date") as string,
    hours: Number(formData.get("hours")),
    projectId: formData.get("projectId") as string,
    billable: formData.get("billable") === "true",
    hourlyRate: formData.get("hourlyRate")
      ? Number(formData.get("hourlyRate"))
      : null,
  }

  const parsed = timeEntrySchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as TimeEntryState["errors"],
    }
  }

  try {
    const { team } = await getCurrentTeam()

    const existing = await db.timeEntry.findFirst({
      where: { id, project: { teamId: team.id } },
    })

    if (!existing) {
      return {
        errors: {
          _form: ["Tidsregistreringen ble ikke funnet eller du har ikke tilgang."],
        },
      }
    }

    await db.timeEntry.update({
      where: { id },
      data: {
        description: parsed.data.description || null,
        date: new Date(parsed.data.date),
        hours: parsed.data.hours,
        projectId: parsed.data.projectId,
        billable: parsed.data.billable,
        hourlyRate: parsed.data.hourlyRate
          ? Math.round(parsed.data.hourlyRate * 100)
          : null,
      },
    })

    revalidatePath("/timer")
    return { success: true }
  } catch {
    return {
      errors: { _form: ["Noe gikk galt. Vennligst prøv igjen."] },
    }
  }
}

export async function deleteTimeEntry(id: string): Promise<{ error?: string }> {
  try {
    const { team } = await getCurrentTeam()

    const existing = await db.timeEntry.findFirst({
      where: { id, project: { teamId: team.id } },
    })

    if (!existing) {
      return { error: "Tidsregistreringen ble ikke funnet eller du har ikke tilgang." }
    }

    await db.timeEntry.delete({ where: { id } })

    revalidatePath("/timer")
    return {}
  } catch {
    return { error: "Noe gikk galt. Vennligst prøv igjen." }
  }
}
