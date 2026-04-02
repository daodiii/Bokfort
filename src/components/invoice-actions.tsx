"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  updateInvoiceStatus,
  markAsPaid,
  deleteInvoice,
  createCreditNote,
} from "@/actions/invoices"
import { sendInvoiceEmail } from "@/actions/send-invoice-email"
import type { InvoiceStatus, InvoiceType } from "@/generated/prisma/client"
import { Send, CheckCircle, Pencil, Trash2, Download, FileText, CreditCard, Mail } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type InvoiceActionsProps = {
  invoiceId: string
  status: InvoiceStatus
  invoiceType?: InvoiceType
  hasOrgNumber?: boolean
  customerEmail?: string | null
}

export function InvoiceActions({
  invoiceId,
  status,
  invoiceType,
  hasOrgNumber,
  customerEmail,
}: InvoiceActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleMarkAsSent() {
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoiceId, "SENT")
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Faktura merket som sendt")
      }
      router.refresh()
    })
  }

  function handleMarkAsPaid() {
    startTransition(async () => {
      const result = await markAsPaid(invoiceId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Faktura merket som betalt")
      }
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm("Er du sikker på at du vil slette denne fakturaen?")) return
    startTransition(async () => {
      const result = await deleteInvoice(invoiceId)
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  function handleSendEmail() {
    if (!customerEmail) {
      toast.error("Kunden mangler e-postadresse")
      return
    }
    if (
      !confirm(
        `Send ${invoiceType === "CREDIT_NOTE" ? "kreditnota" : "faktura"} til ${customerEmail}?`
      )
    )
      return

    startTransition(async () => {
      const result = await sendInvoiceEmail(invoiceId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Sendt til ${customerEmail}`)
      }
      router.refresh()
    })
  }

  const canSendEmail = !!customerEmail

  return (
    <div className="flex flex-wrap gap-2">
      {/* PDF download */}
      <Button variant="outline" render={<Link href={`/api/faktura/${invoiceId}/pdf`} target="_blank" />}>
        <Download className="size-4" />
        Last ned PDF
      </Button>

      {/* EHF download — only for sent/paid invoices with org number */}
      {(status === "SENT" || status === "PAID") && hasOrgNumber && (
        <>
          <Button variant="outline" render={<Link href={`/api/faktura/${invoiceId}/ehf`} target="_blank" />}>
            <FileText className="size-4" />
            Last ned EHF
          </Button>
          <a
            href="https://peppolvalidator.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:underline self-center"
          >
            Valider EHF &rarr;
          </a>
        </>
      )}

      {/* Send email — available for DRAFT (sends + marks as SENT), SENT/OVERDUE (re-send) */}
      {(status === "DRAFT" || status === "SENT" || status === "OVERDUE") && (
        <Button
          variant={status === "DRAFT" ? "default" : "outline"}
          onClick={handleSendEmail}
          disabled={isPending || !canSendEmail}
          title={!canSendEmail ? "Kunden mangler e-postadresse" : undefined}
        >
          <Mail className="size-4" />
          {status === "DRAFT" ? "Send på e-post" : "Send på nytt"}
        </Button>
      )}

      {/* Draft-specific actions */}
      {status === "DRAFT" && (
        <>
          <Button
            variant="outline"
            render={<Link href={`/faktura/${invoiceId}/rediger`} />}
          >
            <Pencil className="size-4" />
            Rediger
          </Button>
          <Button variant="outline" onClick={handleMarkAsSent} disabled={isPending}>
            <Send className="size-4" />
            Merk som sendt
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="size-4" />
            Slett
          </Button>
        </>
      )}

      {(status === "SENT" || status === "OVERDUE") && (
        <Button onClick={handleMarkAsPaid} disabled={isPending}>
          <CheckCircle className="size-4" />
          Merk som betalt
        </Button>
      )}

      {/* Credit note — only for sent/paid standard invoices */}
      {(status === "SENT" || status === "PAID") && invoiceType !== "CREDIT_NOTE" && (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await createCreditNote(invoiceId)
              if (result.errors?._form) {
                toast.error(result.errors._form[0])
              }
            })
          }}
        >
          <CreditCard className="size-4" />
          Opprett kreditnota
        </Button>
      )}
    </div>
  )
}
