"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  updateTravelExpenseStatus,
  deleteTravelExpense,
} from "@/actions/travel-expenses"
import type { TravelExpenseStatus } from "@/generated/prisma/client"
import {
  Send,
  CheckCircle,
  XCircle,
  Banknote,
  Trash2,
} from "lucide-react"

interface TravelExpenseActionsProps {
  id: string
  status: TravelExpenseStatus
}

export function TravelExpenseActions({
  id,
  status,
}: TravelExpenseActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(newStatus: TravelExpenseStatus) {
    startTransition(async () => {
      const result = await updateTravelExpenseStatus(id, newStatus)
      if (result.error) {
        alert(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleDelete() {
    if (!confirm("Er du sikker pa at du vil slette denne reiseregningen?")) {
      return
    }
    startTransition(async () => {
      const result = await deleteTravelExpense(id)
      if (result?.error) {
        alert(result.error)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* DRAFT -> Submit */}
      {status === "DRAFT" && (
        <>
          <button
            onClick={() => handleStatusChange("SUBMITTED")}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Send className="size-4" />
            {isPending ? "Sender..." : "Send inn"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            Slett
          </button>
        </>
      )}

      {/* SUBMITTED -> Approve / Reject */}
      {status === "SUBMITTED" && (
        <>
          <button
            onClick={() => handleStatusChange("APPROVED")}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <CheckCircle className="size-4" />
            {isPending ? "Godkjenner..." : "Godkjenn"}
          </button>
          <button
            onClick={() => handleStatusChange("REJECTED")}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50"
          >
            <XCircle className="size-4" />
            Avvis
          </button>
        </>
      )}

      {/* APPROVED -> Mark as reimbursed */}
      {status === "APPROVED" && (
        <button
          onClick={() => handleStatusChange("REIMBURSED")}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 disabled:opacity-50"
        >
          <Banknote className="size-4" />
          {isPending ? "Utbetaler..." : "Marker som utbetalt"}
        </button>
      )}

      {/* REJECTED -> Reopen as draft */}
      {status === "REJECTED" && (
        <button
          onClick={() => handleStatusChange("DRAFT")}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {isPending ? "Gjenopner..." : "Gjenopne som utkast"}
        </button>
      )}
    </div>
  )
}
