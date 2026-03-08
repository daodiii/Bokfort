"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DateRangeSelector({
  defaultFrom,
  defaultTo,
  basePath,
}: {
  defaultFrom: string
  defaultTo: string
  basePath: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const fra = formData.get("fra") as string
    const til = formData.get("til") as string

    const params = new URLSearchParams(searchParams.toString())
    if (fra) params.set("fra", fra)
    if (til) params.set("til", til)

    startTransition(() => {
      router.replace(`${basePath}?${params.toString()}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
      <div className="space-y-1.5">
        <Label htmlFor="fra">Fra</Label>
        <Input
          type="date"
          id="fra"
          name="fra"
          defaultValue={defaultFrom}
          className="w-[160px]"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="til">Til</Label>
        <Input
          type="date"
          id="til"
          name="til"
          defaultValue={defaultTo}
          className="w-[160px]"
        />
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Laster..." : "Oppdater"}
      </Button>
    </form>
  )
}
