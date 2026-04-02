"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { generateKID } from "@/lib/kid"
import { revalidatePath } from "next/cache"

/**
 * Auto-assign a KID number to an invoice.
 * Generates a KID based on the invoice number using MOD10.
 * Skips if the invoice already has a KID assigned.
 *
 * @param invoiceId - The invoice ID to assign a KID to
 * @returns The generated KID string, or an error
 */
export async function assignKidNumber(
  invoiceId: string
): Promise<{ kidNumber?: string; error?: string }> {
  const { team } = await getCurrentTeam()

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, teamId: team.id },
    select: { id: true, invoiceNumber: true, kidNumber: true },
  })

  if (!invoice) {
    return { error: "Fakturaen ble ikke funnet." }
  }

  // If KID is already assigned, return it
  if (invoice.kidNumber) {
    return { kidNumber: invoice.kidNumber }
  }

  try {
    const kidNumber = generateKID(invoice.invoiceNumber)

    await db.invoice.update({
      where: { id: invoiceId },
      data: { kidNumber },
    })

    revalidatePath("/faktura")
    revalidatePath(`/faktura/${invoiceId}`)

    return { kidNumber }
  } catch {
    return { error: "Kunne ikke generere KID-nummer. Vennligst pr\u00f8v igjen." }
  }
}
