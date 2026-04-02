"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { approvePayrollRun, markPayrollPaid, deletePayrollRun } from "@/actions/payroll"
import { CheckCircle, CreditCard, Trash2, Loader2 } from "lucide-react"

type PayrollActionButtonsProps = {
  id: string
  status: "DRAFT" | "APPROVED" | "PAID"
}

export function PayrollActionButtons({ id, status }: PayrollActionButtonsProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleApprove() {
    startTransition(async () => {
      const result = await approvePayrollRun(id)
      if (result.error) {
        alert(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markPayrollPaid(id)
      if (result.error) {
        alert(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleDelete() {
    if (!confirm("Er du sikker på at du vil slette dette utkastet?")) return
    startTransition(async () => {
      const result = await deletePayrollRun(id)
      if (result.error) {
        alert(result.error)
      } else {
        router.push("/lonn")
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      {status === "DRAFT" && (
        <>
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle className="size-4" />
            )}
            Godkjenn
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 rounded-lg font-medium text-sm transition-all disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Slett utkast
          </button>
        </>
      )}
      {status === "APPROVED" && (
        <button
          onClick={handleMarkPaid}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-sm shadow-sm shadow-primary/20 transition-all disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CreditCard className="size-4" />
          )}
          Marker som betalt
        </button>
      )}
      {status === "PAID" && (
        <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-sm border border-emerald-200">
          <CheckCircle className="size-4" />
          Utbetalt
        </span>
      )}
    </div>
  )
}
