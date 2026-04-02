"use server"

import { db } from "@/lib/db"
import { getCurrentTeam } from "@/lib/auth-utils"
import { resend, FROM_EMAIL } from "@/lib/email"
import { InvoiceEmail } from "@/components/emails/invoice-email"
import { InvoicePdf } from "@/components/invoice-pdf"
import { updateInvoiceStatus } from "@/actions/invoices"
import { renderToBuffer } from "@react-pdf/renderer"
import { revalidatePath } from "next/cache"
import React from "react"

function formatNorwegianCurrency(ore: number): string {
  const kroner = ore / 100
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kroner)
}

function formatNorwegianDate(date: Date): string {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export async function sendInvoiceEmail(
  invoiceId: string
): Promise<{ error?: string; success?: boolean }> {
  const { team } = await getCurrentTeam()

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, teamId: team.id },
    include: {
      customer: true,
      lines: true,
    },
  })

  if (!invoice) {
    return { error: "Faktura ikke funnet" }
  }

  if (!invoice.customer.email) {
    return { error: "Kunden mangler e-postadresse" }
  }

  if (!process.env.RESEND_API_KEY) {
    return { error: "E-posttjeneste er ikke konfigurert (mangler RESEND_API_KEY)" }
  }

  const isCreditNote = invoice.invoiceType === "CREDIT_NOTE"
  const companyName = team.companyName || team.name
  const typeLabel = isCreditNote ? "kreditnota" : "faktura"

  // Generate PDF buffer
  const pdfTeam = {
    companyName: team.companyName,
    name: team.name,
    orgNumber: team.orgNumber,
    address: team.address,
    city: team.city,
    postalCode: team.postalCode,
    bankAccount: team.bankAccount,
    logoUrl: team.logoUrl,
    mvaRegistered: team.mvaRegistered,
  }

  const pdfInvoice = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceType: invoice.invoiceType as "INVOICE" | "CREDIT_NOTE",
    kidNumber: invoice.kidNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotal: invoice.subtotal,
    mvaAmount: invoice.mvaAmount,
    total: invoice.total,
    notes: invoice.notes,
    lines: invoice.lines,
    customer: invoice.customer,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(InvoicePdf, {
      invoice: pdfInvoice,
      team: pdfTeam,
    }) as any
  )

  // Send email via Resend
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: invoice.customer.email,
    subject: `${isCreditNote ? "Kreditnota" : "Faktura"} #${invoice.invoiceNumber} fra ${companyName}`,
    react: React.createElement(InvoiceEmail, {
      companyName,
      invoiceNumber: invoice.invoiceNumber,
      totalFormatted: formatNorwegianCurrency(invoice.total),
      dueDateFormatted: formatNorwegianDate(invoice.dueDate),
      kidNumber: invoice.kidNumber,
      bankAccount: team.bankAccount,
      customerName: invoice.customer.name,
      isCreditNote,
    }),
    attachments: [
      {
        filename: `${typeLabel}-${invoice.invoiceNumber}.pdf`,
        content: Buffer.from(pdfBuffer),
      },
    ],
  })

  if (error) {
    return { error: `Kunne ikke sende e-post: ${error.message}` }
  }

  // Auto-update status to SENT if currently DRAFT
  if (invoice.status === "DRAFT") {
    const statusResult = await updateInvoiceStatus(invoiceId, "SENT")
    if (statusResult.error) {
      // Email was sent, but status update failed — log but don't fail the action
      console.error(
        `Email sent but status update failed for invoice ${invoiceId}: ${statusResult.error}`
      )
    }
  }

  revalidatePath(`/faktura/${invoiceId}`)
  revalidatePath("/faktura")

  return { success: true }
}
