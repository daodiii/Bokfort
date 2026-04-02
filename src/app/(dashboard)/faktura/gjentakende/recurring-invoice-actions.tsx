"use client"

import { useTransition } from "react"
import { Play, Pause, Trash2 } from "lucide-react"
import {
  toggleRecurringInvoice,
  deleteRecurringInvoice,
} from "@/actions/recurring-invoices"

interface RecurringInvoiceActionsProps {
  id: string
  isActive: boolean
}

export function RecurringInvoiceActions({
  id,
  isActive,
}: RecurringInvoiceActionsProps) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await toggleRecurringInvoice(id)
    })
  }

  function handleDelete() {
    if (!confirm("Er du sikker på at du vil slette denne gjentakende fakturaen?")) {
      return
    }
    startTransition(async () => {
      await deleteRecurringInvoice(id)
    })
  }

  return (
    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-primary transition-colors disabled:opacity-50"
        title={isActive ? "Sett på pause" : "Aktiver"}
      >
        {isActive ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
        title="Slett"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
