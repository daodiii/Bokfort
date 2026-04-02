"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Zap } from "lucide-react"
import { triggerRecurringGeneration } from "@/actions/generate-recurring-invoices"
import { toast } from "sonner"

export function GenerateNowButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleGenerate() {
    startTransition(async () => {
      const result = await triggerRecurringGeneration()

      if (result.errors.length > 0) {
        toast.error(result.errors[0])
      }

      if (result.generated > 0) {
        toast.success(
          `${result.generated} ${result.generated === 1 ? "faktura" : "fakturaer"} generert`
        )
      } else if (result.errors.length === 0) {
        toast.info("Ingen fakturaer var forfalt for generering")
      }

      router.refresh()
    })
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-lg text-sm font-medium text-slate-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
    >
      <Zap className="size-4" />
      {isPending ? "Genererer..." : "Generer nå"}
    </button>
  )
}
