import { cn } from "@/lib/utils"
import type { InvoiceStatus } from "@/generated/prisma/client"

const statusConfig: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Utkast",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  },
  SENT: {
    label: "Sendt",
    className: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  PAID: {
    label: "Betalt",
    className: "bg-primary/10 text-primary border border-primary/20",
  },
  OVERDUE: {
    label: "Forfalt",
    className: "bg-rose-100 text-rose-700 border border-rose-200",
  },
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
