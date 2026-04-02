"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition, useRef } from "react"
import { Calendar, ChevronDown } from "lucide-react"

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

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
  const fromRef = useRef<HTMLInputElement>(null)
  const toRef = useRef<HTMLInputElement>(null)

  function handleChange() {
    const fra = fromRef.current?.value
    const til = toRef.current?.value
    if (!fra || !til) return

    const params = new URLSearchParams(searchParams.toString())
    params.set("fra", fra)
    params.set("til", til)

    startTransition(() => {
      router.replace(`${basePath}?${params.toString()}`)
    })
  }

  return (
    <div className="relative flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 gap-2 shadow-sm">
      <Calendar className="size-4 text-slate-400" />
      <span className={`text-sm font-medium ${isPending ? "opacity-50" : ""}`}>
        {formatDisplayDate(defaultFrom)} &ndash;{" "}
        {formatDisplayDate(defaultTo)}
      </span>
      <ChevronDown className="size-4 text-slate-400" />

      {/* Hidden date inputs layered on top for native date picker interaction */}
      <input
        ref={fromRef}
        type="date"
        defaultValue={defaultFrom}
        onChange={handleChange}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Fra dato"
      />
      {/* Second input positioned right-side to handle "to" date */}
      <input
        ref={toRef}
        type="date"
        defaultValue={defaultTo}
        onChange={handleChange}
        className="absolute right-0 top-0 h-full w-1/2 cursor-pointer opacity-0"
        aria-label="Til dato"
      />
    </div>
  )
}
