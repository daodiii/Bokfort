"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { lookupCompany } from "@/lib/brreg"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const customerSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  email: z.string().email("Ugyldig e-postadresse").or(z.literal("")).optional(),
  phone: z.string().optional(),
  orgNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
})

export type CustomerFormState = {
  errors?: {
    name?: string[]
    email?: string[]
    phone?: string[]
    orgNumber?: string[]
    address?: string[]
    city?: string[]
    postalCode?: string[]
    _form?: string[]
  }
  success?: boolean
}

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const { team } = await getCurrentTeam()

  const rawData = {
    name: formData.get("name") as string,
    email: formData.get("email") as string || undefined,
    phone: formData.get("phone") as string || undefined,
    orgNumber: formData.get("orgNumber") as string || undefined,
    address: formData.get("address") as string || undefined,
    city: formData.get("city") as string || undefined,
    postalCode: formData.get("postalCode") as string || undefined,
  }

  const parsed = customerSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as CustomerFormState["errors"],
    }
  }

  try {
    await db.customer.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        orgNumber: parsed.data.orgNumber || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        postalCode: parsed.data.postalCode || null,
        teamId: team.id,
      },
    })
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt ved opprettelse av kunden. Vennligst prøv igjen."],
      },
    }
  }

  revalidatePath("/kunder")
  redirect("/kunder")
}

export async function updateCustomer(
  id: string,
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const { team } = await getCurrentTeam()

  // Verify team ownership
  const existing = await db.customer.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return {
      errors: {
        _form: ["Kunden ble ikke funnet."],
      },
    }
  }

  const rawData = {
    name: formData.get("name") as string,
    email: formData.get("email") as string || undefined,
    phone: formData.get("phone") as string || undefined,
    orgNumber: formData.get("orgNumber") as string || undefined,
    address: formData.get("address") as string || undefined,
    city: formData.get("city") as string || undefined,
    postalCode: formData.get("postalCode") as string || undefined,
  }

  const parsed = customerSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as CustomerFormState["errors"],
    }
  }

  try {
    await db.customer.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        orgNumber: parsed.data.orgNumber || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        postalCode: parsed.data.postalCode || null,
      },
    })
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt ved oppdatering av kunden. Vennligst prøv igjen."],
      },
    }
  }

  revalidatePath("/kunder")
  revalidatePath(`/kunder/${id}`)
  redirect(`/kunder/${id}`)
}

export async function deleteCustomer(id: string): Promise<{ error?: string }> {
  const { team } = await getCurrentTeam()

  // Verify team ownership
  const existing = await db.customer.findFirst({
    where: { id, teamId: team.id },
  })

  if (!existing) {
    return { error: "Kunden ble ikke funnet." }
  }

  // Check if customer has invoices
  const invoiceCount = await db.invoice.count({
    where: { customerId: id },
  })

  if (invoiceCount > 0) {
    return {
      error: `Kunden har ${invoiceCount} ${invoiceCount === 1 ? "faktura" : "fakturaer"} og kan ikke slettes.`,
    }
  }

  try {
    await db.customer.delete({
      where: { id },
    })
  } catch {
    return { error: "Noe gikk galt ved sletting av kunden. Vennligst prøv igjen." }
  }

  revalidatePath("/kunder")
  redirect("/kunder")
}

export async function lookupBrreg(
  orgNumber: string
): Promise<{
  success: boolean
  data?: {
    name: string
    orgNumber: string
    address: string | null
    postalCode: string | null
    city: string | null
  }
  error?: string
}> {
  const digits = orgNumber.replace(/\s/g, "")

  if (digits.length !== 9) {
    return {
      success: false,
      error: "Organisasjonsnummer må være 9 siffer.",
    }
  }

  const result = await lookupCompany(digits)

  if (!result) {
    return {
      success: false,
      error: "Fant ingen virksomhet med dette organisasjonsnummeret.",
    }
  }

  return {
    success: true,
    data: result,
  }
}
