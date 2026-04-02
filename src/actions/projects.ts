"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const projectSchema = z.object({
  name: z.string().min(1, "Prosjektnavn er påkrevd"),
  description: z.string().optional(),
  customerId: z.string().optional(),
  color: z.string().default("#10b981"),
  budget: z.number().nullable().optional(),
  hourlyRate: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
})

const timeEntrySchema = z.object({
  description: z.string().optional(),
  date: z.string().min(1, "Dato er påkrevd"),
  hours: z.number().min(0.01, "Timer må være større enn 0"),
  projectId: z.string().min(1),
  billable: z.boolean().default(true),
  hourlyRate: z.number().nullable().optional(),
})

export type ProjectFormState = {
  errors?: {
    name?: string[]
    description?: string[]
    customerId?: string[]
    color?: string[]
    budget?: string[]
    hourlyRate?: string[]
    _form?: string[]
  }
  success?: boolean
}

export type TimeEntryFormState = {
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

export async function getProjects() {
  const { team } = await getCurrentTeam()

  const projects = await db.project.findMany({
    where: { teamId: team.id },
    include: {
      customer: { select: { id: true, name: true } },
      timeEntries: { select: { hours: true, billable: true } },
      expenses: { select: { amount: true } },
      invoices: { select: { total: true } },
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  })

  return projects.map((p) => {
    const totalHours = p.timeEntries.reduce((s, e) => s + e.hours, 0)
    const billableHours = p.timeEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0)
    const totalExpenses = p.expenses.reduce((s, e) => s + e.amount, 0)
    const totalInvoiced = p.invoices.reduce((s, e) => s + e.total, 0)

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      isActive: p.isActive,
      budget: p.budget,
      customerName: p.customer?.name ?? null,
      customerId: p.customerId,
      totalHours,
      billableHours,
      totalExpenses,
      totalInvoiced,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }
  })
}

export async function getProjectById(id: string) {
  const { team } = await getCurrentTeam()

  const project = await db.project.findFirst({
    where: { id, teamId: team.id },
    include: {
      customer: { select: { id: true, name: true } },
      timeEntries: {
        include: { user: { select: { name: true } } },
        orderBy: { date: "desc" },
      },
      expenses: {
        include: { category: { select: { name: true } } },
        orderBy: { date: "desc" },
      },
      invoices: {
        include: { customer: { select: { name: true } } },
        orderBy: { issueDate: "desc" },
      },
    },
  })

  if (!project) return null

  const totalHours = project.timeEntries.reduce((s, e) => s + e.hours, 0)
  const billableHours = project.timeEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0)
  const totalExpenses = project.expenses.reduce((s, e) => s + e.amount, 0)
  const totalInvoiced = project.invoices.reduce((s, e) => s + e.total, 0)

  return {
    ...project,
    totalHours,
    billableHours,
    totalExpenses,
    totalInvoiced,
  }
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const { team } = await getCurrentTeam()

  const budgetKr = formData.get("budget") as string
  const hourlyRateKr = formData.get("hourlyRate") as string

  const rawData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    customerId: (formData.get("customerId") as string) || undefined,
    color: (formData.get("color") as string) || "#10b981",
    budget: budgetKr ? Math.round(parseFloat(budgetKr) * 100) : null,
    hourlyRate: hourlyRateKr ? Math.round(parseFloat(hourlyRateKr) * 100) : null,
    isActive: true,
  }

  const parsed = projectSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as ProjectFormState["errors"],
    }
  }

  try {
    await db.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        customerId: parsed.data.customerId || null,
        color: parsed.data.color,
        budget: parsed.data.budget ?? null,
        isActive: true,
        teamId: team.id,
      },
    })
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt ved opprettelse av prosjektet. Vennligst prøv igjen."],
      },
    }
  }

  revalidatePath("/prosjekter")
  redirect("/prosjekter")
}

export async function updateProject(
  id: string,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const { team } = await getCurrentTeam()

  const existing = await db.project.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return {
      errors: { _form: ["Prosjektet ble ikke funnet."] },
    }
  }

  const budgetKr = formData.get("budget") as string
  const hourlyRateKr = formData.get("hourlyRate") as string

  const rawData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    customerId: (formData.get("customerId") as string) || undefined,
    color: (formData.get("color") as string) || "#10b981",
    budget: budgetKr ? Math.round(parseFloat(budgetKr) * 100) : null,
    hourlyRate: hourlyRateKr ? Math.round(parseFloat(hourlyRateKr) * 100) : null,
    isActive: formData.get("isActive") === "true",
  }

  const parsed = projectSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as ProjectFormState["errors"],
    }
  }

  try {
    await db.project.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        customerId: parsed.data.customerId || null,
        color: parsed.data.color,
        budget: parsed.data.budget ?? null,
        isActive: parsed.data.isActive,
      },
    })
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt ved oppdatering av prosjektet. Vennligst prøv igjen."],
      },
    }
  }

  revalidatePath("/prosjekter")
  revalidatePath(`/prosjekter/${id}`)
  redirect(`/prosjekter/${id}`)
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  const existing = await db.project.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return { error: "Prosjektet ble ikke funnet." }
  }

  const timeEntryCount = await db.timeEntry.count({ where: { projectId: id } })
  const expenseCount = await db.expense.count({ where: { projectId: id } })
  const invoiceCount = await db.invoice.count({ where: { projectId: id } })

  if (timeEntryCount > 0 || expenseCount > 0 || invoiceCount > 0) {
    return {
      error: `Prosjektet har registrerte data (${timeEntryCount} timer, ${expenseCount} utgifter, ${invoiceCount} fakturaer) og kan ikke slettes. Deaktiver det i stedet.`,
    }
  }

  try {
    await db.project.delete({ where: { id } })
  } catch {
    return { error: "Noe gikk galt ved sletting av prosjektet. Vennligst prøv igjen." }
  }

  revalidatePath("/prosjekter")
  redirect("/prosjekter")
}

export async function createTimeEntry(
  _prevState: TimeEntryFormState,
  formData: FormData
): Promise<TimeEntryFormState> {
  const { user } = await getCurrentTeam()

  const rawData = {
    description: (formData.get("description") as string) || undefined,
    date: formData.get("date") as string,
    hours: parseFloat(formData.get("hours") as string),
    projectId: formData.get("projectId") as string,
    billable: formData.get("billable") !== "false",
    hourlyRate: formData.get("hourlyRate")
      ? Math.round(parseFloat(formData.get("hourlyRate") as string) * 100)
      : null,
  }

  const parsed = timeEntrySchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as TimeEntryFormState["errors"],
    }
  }

  try {
    await db.timeEntry.create({
      data: {
        description: parsed.data.description || null,
        date: new Date(parsed.data.date),
        hours: parsed.data.hours,
        projectId: parsed.data.projectId,
        userId: user.id,
        billable: parsed.data.billable,
        hourlyRate: parsed.data.hourlyRate ?? null,
      },
    })
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt ved registrering av timer. Vennligst prøv igjen."],
      },
    }
  }

  revalidatePath(`/prosjekter/${parsed.data.projectId}`)
  redirect(`/prosjekter/${parsed.data.projectId}`)
}
