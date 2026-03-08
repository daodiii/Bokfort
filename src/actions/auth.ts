"use server"

import { z } from "zod"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { signIn } from "@/lib/auth"

const registerSchema = z.object({
  name: z.string().min(1, "Navn er p\u00e5krevd"),
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(8, "Passord m\u00e5 v\u00e6re minst 8 tegn"),
  companyName: z.string().min(1, "Firmanavn er p\u00e5krevd"),
  orgNumber: z.string().optional(),
  companyType: z.enum(["ENK", "AS"], {
    message: "Velg en gyldig selskapstype",
  }),
})

export type RegisterState = {
  errors?: {
    name?: string[]
    email?: string[]
    password?: string[]
    companyName?: string[]
    orgNumber?: string[]
    companyType?: string[]
    _form?: string[]
  }
  success?: boolean
}

export async function register(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    companyName: formData.get("companyName"),
    orgNumber: formData.get("orgNumber") || undefined,
    companyType: formData.get("companyType"),
  }

  const parsed = registerSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as RegisterState["errors"],
    }
  }

  const { name, email, password, companyName, orgNumber, companyType } =
    parsed.data

  const existingUser = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existingUser) {
    return {
      errors: {
        email: ["Denne e-postadressen er allerede registrert"],
      },
    }
  }

  const passwordHash = await hash(password, 12)

  try {
    await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        memberships: {
          create: {
            role: "ADMIN",
            team: {
              create: {
                name: companyName,
                companyName,
                orgNumber: orgNumber || null,
                companyType,
              },
            },
          },
        },
      },
    })

    await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirect: false,
    })

    return { success: true }
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt. Vennligst pr\u00f8v igjen."],
      },
    }
  }
}
