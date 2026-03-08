"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteIncome } from "@/actions/incomes"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function DeleteIncomeButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    if (!confirm("Er du sikker på at du vil slette denne inntekten?")) return

    startTransition(async () => {
      const result = await deleteIncome(id)
      if (result.error) {
        setError(result.error)
      } else {
        router.push("/inntekter")
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="size-4" />
        {isPending ? "Sletter..." : "Slett"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
