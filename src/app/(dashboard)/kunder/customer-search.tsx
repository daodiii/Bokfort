"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

export function CustomerSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (term) {
      params.set("sok", term)
    } else {
      params.delete("sok")
    }
    startTransition(() => {
      router.replace(`/kunder?${params.toString()}`)
    })
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Søk etter kunder..."
        className="pl-8"
        defaultValue={defaultValue}
        onChange={(e) => handleSearch(e.target.value)}
        aria-label="Søk etter kunder"
      />
      {isPending && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}
    </div>
  )
}
