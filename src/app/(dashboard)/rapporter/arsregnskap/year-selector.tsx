"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

export function YearSelector({
  years,
  currentYear,
}: {
  years: number[]
  currentYear: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("ar", e.target.value)
      router.push(`/rapporter/arsregnskap?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <select
      value={currentYear}
      onChange={handleChange}
      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all cursor-pointer"
    >
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  )
}
