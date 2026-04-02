"use client"

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
    // Reset page on new search
    params.delete("side")
    startTransition(() => {
      router.replace(`/kunder?${params.toString()}`)
    })
  }

  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        placeholder="S\u00f8k etter kunder..."
        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary/50 text-sm"
        defaultValue={defaultValue}
        onChange={(e) => handleSearch(e.target.value)}
        aria-label="S\u00f8k etter kunder"
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="size-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        </div>
      )}
    </div>
  )
}
