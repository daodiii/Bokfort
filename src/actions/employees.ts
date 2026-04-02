"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { encrypt, decrypt } from "@/lib/crypto"

const employeeSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  email: z.string().email("Ugyldig e-postadresse").or(z.literal("")).optional(),
  phone: z.string().optional(),
  personnummer: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  startDate: z.string().min(1, "Startdato er påkrevd"),
  monthlySalary: z.number().min(0, "Månedslønn må være positiv"),
  taxPercent: z.number().min(0).max(100).default(30),
  pensionPercent: z.number().min(0).max(100).default(2),
  bankAccount: z.string().optional(),
})

export type EmployeeFormState = {
  errors?: {
    name?: string[]
    email?: string[]
    phone?: string[]
    personnummer?: string[]
    position?: string[]
    department?: string[]
    startDate?: string[]
    monthlySalary?: string[]
    taxPercent?: string[]
    pensionPercent?: string[]
    bankAccount?: string[]
    _form?: string[]
  }
  success?: boolean
}

export async function getEmployees() {
  const { team } = await getCurrentTeam()

  const employees = await db.employee.findMany({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
  })

  return employees.map((e) => ({
    ...e,
    personnummer: e.personnummer ? decrypt(e.personnummer) : null,
  }))
}

export async function createEmployee(
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const { team } = await getCurrentTeam()

  const salaryKr = parseFloat(formData.get("monthlySalary") as string) || 0
  const taxPct = parseFloat(formData.get("taxPercent") as string) || 30
  const pensionPct = parseFloat(formData.get("pensionPercent") as string) || 2

  const rawData = {
    name: formData.get("name") as string,
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    personnummer: (formData.get("personnummer") as string) || undefined,
    position: (formData.get("position") as string) || undefined,
    department: (formData.get("department") as string) || undefined,
    startDate: formData.get("startDate") as string,
    monthlySalary: Math.round(salaryKr * 100), // Convert kr to øre
    taxPercent: taxPct,
    pensionPercent: pensionPct,
    bankAccount: (formData.get("bankAccount") as string) || undefined,
  }

  const parsed = employeeSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as EmployeeFormState["errors"],
    }
  }

  try {
    await db.employee.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        personnummer: parsed.data.personnummer ? encrypt(parsed.data.personnummer) : null,
        position: parsed.data.position || null,
        department: parsed.data.department || null,
        startDate: new Date(parsed.data.startDate),
        monthlySalary: parsed.data.monthlySalary,
        taxPercent: parsed.data.taxPercent,
        pensionPercent: parsed.data.pensionPercent,
        bankAccount: parsed.data.bankAccount || null,
        teamId: team.id,
      },
    })
  } catch {
    return {
      errors: {
        _form: [
          "Noe gikk galt ved opprettelse av ansatt. Vennligst prøv igjen.",
        ],
      },
    }
  }

  revalidatePath("/lonn")
  redirect("/lonn")
}

export async function updateEmployee(
  id: string,
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const { team } = await getCurrentTeam()

  const existing = await db.employee.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return {
      errors: { _form: ["Ansatt ble ikke funnet."] },
    }
  }

  const salaryKr = parseFloat(formData.get("monthlySalary") as string) || 0
  const taxPct = parseFloat(formData.get("taxPercent") as string) || 30
  const pensionPct = parseFloat(formData.get("pensionPercent") as string) || 2

  const rawData = {
    name: formData.get("name") as string,
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    personnummer: (formData.get("personnummer") as string) || undefined,
    position: (formData.get("position") as string) || undefined,
    department: (formData.get("department") as string) || undefined,
    startDate: formData.get("startDate") as string,
    monthlySalary: Math.round(salaryKr * 100),
    taxPercent: taxPct,
    pensionPercent: pensionPct,
    bankAccount: (formData.get("bankAccount") as string) || undefined,
  }

  const parsed = employeeSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as EmployeeFormState["errors"],
    }
  }

  try {
    await db.employee.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        personnummer: parsed.data.personnummer ? encrypt(parsed.data.personnummer) : null,
        position: parsed.data.position || null,
        department: parsed.data.department || null,
        startDate: new Date(parsed.data.startDate),
        monthlySalary: parsed.data.monthlySalary,
        taxPercent: parsed.data.taxPercent,
        pensionPercent: parsed.data.pensionPercent,
        bankAccount: parsed.data.bankAccount || null,
      },
    })
  } catch {
    return {
      errors: {
        _form: [
          "Noe gikk galt ved oppdatering av ansatt. Vennligst prøv igjen.",
        ],
      },
    }
  }

  revalidatePath("/lonn")
  redirect("/lonn")
}

export async function deleteEmployee(
  id: string
): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  const existing = await db.employee.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return { error: "Ansatt ble ikke funnet." }
  }

  // Soft delete - set isActive to false
  try {
    await db.employee.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
    })
  } catch {
    return {
      error: "Noe gikk galt ved deaktivering av ansatt. Vennligst prøv igjen.",
    }
  }

  revalidatePath("/lonn")
  return {}
}
