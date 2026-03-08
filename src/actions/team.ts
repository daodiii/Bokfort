"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

// --- Schemas ---

const inviteSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
})

const teamSettingsSchema = z.object({
  companyName: z.string().min(1, "Firmanavn er påkrevd"),
  orgNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  companyType: z.enum(["ENK", "AS"]).optional(),
  bankAccount: z.string().optional(),
  mvaRegistered: z.boolean().optional(),
  logoUrl: z.string().url("Ugyldig URL").optional().or(z.literal("")),
})

// --- Types ---

export type InviteFormState = {
  errors?: {
    email?: string[]
    _form?: string[]
  }
  success?: boolean
  message?: string
}

export type TeamSettingsFormState = {
  errors?: {
    companyName?: string[]
    orgNumber?: string[]
    address?: string[]
    city?: string[]
    postalCode?: string[]
    companyType?: string[]
    bankAccount?: string[]
    mvaRegistered?: string[]
    logoUrl?: string[]
    _form?: string[]
  }
  success?: boolean
}

// --- Actions ---

export async function inviteMember(
  _prevState: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  const { team, role } = await getCurrentTeam()

  if (role !== "ADMIN") {
    return {
      errors: { _form: ["Kun administratorer kan invitere medlemmer."] },
    }
  }

  const rawData = {
    email: (formData.get("email") as string)?.trim().toLowerCase(),
  }

  const parsed = inviteSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as InviteFormState["errors"],
    }
  }

  const { email } = parsed.data

  try {
    // Check if user exists
    const targetUser = await db.user.findUnique({
      where: { email },
    })

    if (!targetUser) {
      return {
        message: "Brukeren må registrere seg først med denne e-postadressen.",
      }
    }

    // Check if already a member
    const existingMembership = await db.membership.findUnique({
      where: {
        userId_teamId: {
          userId: targetUser.id,
          teamId: team.id,
        },
      },
    })

    if (existingMembership) {
      return {
        errors: { _form: ["Denne brukeren er allerede medlem av teamet."] },
      }
    }

    // Create membership
    await db.membership.create({
      data: {
        userId: targetUser.id,
        teamId: team.id,
        role: "MEMBER",
      },
    })

    revalidatePath("/team")
    return {
      success: true,
      message: `${targetUser.name} ble lagt til som medlem.`,
    }
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt. Vennligst prøv igjen."],
      },
    }
  }
}

export async function removeMember(
  membershipId: string
): Promise<{ error?: string }> {
  const { team, role, user } = await getCurrentTeam()

  if (role !== "ADMIN") {
    return { error: "Kun administratorer kan fjerne medlemmer." }
  }

  try {
    // Find the membership
    const membership = await db.membership.findFirst({
      where: { id: membershipId, teamId: team.id },
    })

    if (!membership) {
      return { error: "Medlemskapet ble ikke funnet." }
    }

    // Cannot remove yourself
    if (membership.userId === user.id) {
      return { error: "Du kan ikke fjerne deg selv." }
    }

    // Check if this is the last admin
    if (membership.role === "ADMIN") {
      const adminCount = await db.membership.count({
        where: { teamId: team.id, role: "ADMIN" },
      })
      if (adminCount <= 1) {
        return { error: "Du kan ikke fjerne den siste administratoren." }
      }
    }

    await db.membership.delete({
      where: { id: membershipId },
    })

    revalidatePath("/team")
    return {}
  } catch {
    return { error: "Noe gikk galt. Vennligst prøv igjen." }
  }
}

export async function updateMemberRole(
  membershipId: string,
  newRole: "ADMIN" | "MEMBER"
): Promise<{ error?: string }> {
  const { team, role, user } = await getCurrentTeam()

  if (role !== "ADMIN") {
    return { error: "Kun administratorer kan endre roller." }
  }

  try {
    const membership = await db.membership.findFirst({
      where: { id: membershipId, teamId: team.id },
    })

    if (!membership) {
      return { error: "Medlemskapet ble ikke funnet." }
    }

    // Cannot change own role
    if (membership.userId === user.id) {
      return { error: "Du kan ikke endre din egen rolle." }
    }

    // If demoting an admin, ensure at least one admin remains
    if (membership.role === "ADMIN" && newRole === "MEMBER") {
      const adminCount = await db.membership.count({
        where: { teamId: team.id, role: "ADMIN" },
      })
      if (adminCount <= 1) {
        return { error: "Det må være minst én administrator." }
      }
    }

    await db.membership.update({
      where: { id: membershipId },
      data: { role: newRole },
    })

    revalidatePath("/team")
    return {}
  } catch {
    return { error: "Noe gikk galt. Vennligst prøv igjen." }
  }
}

export async function updateTeamSettings(
  _prevState: TeamSettingsFormState,
  formData: FormData
): Promise<TeamSettingsFormState> {
  const { team, role } = await getCurrentTeam()

  if (role !== "ADMIN") {
    return {
      errors: { _form: ["Kun administratorer kan endre innstillinger."] },
    }
  }

  const rawData = {
    companyName: formData.get("companyName") as string,
    orgNumber: (formData.get("orgNumber") as string) || undefined,
    address: (formData.get("address") as string) || undefined,
    city: (formData.get("city") as string) || undefined,
    postalCode: (formData.get("postalCode") as string) || undefined,
    companyType: (formData.get("companyType") as string) || undefined,
    bankAccount: (formData.get("bankAccount") as string) || undefined,
    mvaRegistered: formData.get("mvaRegistered") === "true",
    logoUrl: (formData.get("logoUrl") as string) || "",
  }

  const parsed = teamSettingsSchema.safeParse(rawData)

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten()
        .fieldErrors as TeamSettingsFormState["errors"],
    }
  }

  try {
    await db.team.update({
      where: { id: team.id },
      data: {
        companyName: parsed.data.companyName,
        orgNumber: parsed.data.orgNumber || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        postalCode: parsed.data.postalCode || null,
        companyType: parsed.data.companyType as "ENK" | "AS" | undefined,
        bankAccount: parsed.data.bankAccount || null,
        mvaRegistered: parsed.data.mvaRegistered ?? false,
        logoUrl: parsed.data.logoUrl || null,
      },
    })

    revalidatePath("/team")
    revalidatePath("/innstillinger")
    return { success: true }
  } catch {
    return {
      errors: {
        _form: ["Noe gikk galt. Vennligst prøv igjen."],
      },
    }
  }
}
