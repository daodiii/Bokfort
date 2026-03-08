"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  updateInvoiceStatus,
  markAsPaid,
  deleteInvoice,
} from "@/actions/invoices"
import type { InvoiceStatus } from "@/generated/prisma"
import { Send, CheckCircle, Pencil, Trash2, Download } from "lucide-react"
import Link from "next/link"

type InvoiceActionsProps = {
  invoiceId: string
  status: InvoiceStatus
}

export function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
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
    </div>
  )
}
