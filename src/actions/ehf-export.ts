"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { validateEhfData } from "@/lib/ehf-validator"
import { generateEhfInvoiceXml, generateEhfCreditNoteXml } from "@/lib/ehf-generator"
import { mapInvoiceToEhfData } from "@/lib/ehf-mapper"
import type { EhfValidationError } from "@/lib/ehf-types"

export async function exportEhfXml(invoiceId: string): Promise<{
  xml?: string
  filename?: string
  errors?: EhfValidationError[]
}> {
  const { team } = await getCurrentTeam()

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, teamId: team.id },
    include: {
      customer: true,
      lines: true,
      originalInvoice: { select: { invoiceNumber: true } },
    },
  })

  if (!invoice) {
    return { errors: [{ field: "_form", message: "Fakturaen ble ikke funnet." }] }
  }

  if (!team.orgNumber) {
    return { errors: [{ field: "seller.orgNumber", message: "Organisasjonsnummer mangler i innstillinger." }] }
  }

  const data = mapInvoiceToEhfData(invoice, team)

  const validation = validateEhfData(data)
  if (!validation.valid) {
    return { errors: validation.errors }
  }

  const xml = data.type === "creditNote"
    ? generateEhfCreditNoteXml(data)
    : generateEhfInvoiceXml(data)

  const filename = `EHF-${invoice.invoiceNumber}-${team.orgNumber}.xml`

  return { xml, filename }
}
