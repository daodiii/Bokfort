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
import type { InvoiceStatus, InvoiceType } from "@/generated/prisma/client"
import { Send, CheckCircle, Pencil, Trash2, Download, FileText, CreditCard } from "lucide-react"
import Link from "next/link"

type InvoiceActionsProps = {
  invoiceId: string
  status: InvoiceStatus
  invoiceType?: InvoiceType
  hasOrgNumber?: boolean
}

export function InvoiceActions({ invoiceId, status, invoiceType, hasOrgNumber }: InvoiceActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleMarkAsSent() {
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoiceId, "SENT")
      if (result.error) {
        alert(result.error)
      }
      router.refresh()
    })
  }

  function handleMarkAsPaid() {
    startTransition(async () => {
      const result = await markAsPaid(invoiceId)
      if (result.error) {
        alert(result.error)
      }
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm("Er du sikker på at du vil slette denne fakturaen?")) return
    startTransition(async () => {
      const result = await deleteInvoice(invoiceId)
      if (result?.error) {
        alert(result.error)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* PDF download link */}
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

      {/* Status actions */}
      {status === "DRAFT" && (
        <>
          <Button
            variant="outline"
            render={<Link href={`/faktura/${invoiceId}/rediger`} />}
          >
            <Pencil className="size-4" />
            Rediger
          </Button>
          <Button onClick={handleMarkAsSent} disabled={isPending}>
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

      {status === "SENT" && (
        <Button onClick={handleMarkAsPaid} disabled={isPending}>
          <CheckCircle className="size-4" />
          Merk som betalt
        </Button>
      )}

      {status === "OVERDUE" && (
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
                alert(result.errors._form[0])
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
