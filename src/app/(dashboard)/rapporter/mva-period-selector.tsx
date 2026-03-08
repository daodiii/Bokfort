"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const currentYear = new Date().getFullYear()

const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

const terminer = [
  { value: "1", label: "Termin 1 (jan-feb)" },
  { value: "2", label: "Termin 2 (mar-apr)" },
  { value: "3", label: "Termin 3 (mai-jun)" },
  { value: "4", label: "Termin 4 (jul-aug)" },
  { value: "5", label: "Termin 5 (sep-okt)" },
  { value: "6", label: "Termin 6 (nov-des)" },
]

export function MvaPeriodSelector({
  defaultTermin,
  defaultYear,
}: {
  defaultTermin: string
  defaultYear: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleTerminChange(value: string | null) {
    if (!value) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("termin", value)
    startTransition(() => {
      router.replace(`/rapporter/mva?${params.toString()}`)
    })
  }

  function handleYearChange(value: string | null) {
    if (!value) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("aar", value)
    startTransition(() => {
      router.replace(`/rapporter/mva?${params.toString()}`)
    })
  }

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="space-y-1.5">
        <Label>Periode</Label>
        <Select
          defaultValue={defaultTermin}
          onValueChange={handleTerminChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Velg termin" />
          </SelectTrigger>
          <SelectContent>
            {terminer.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>År</Label>
        <Select defaultValue={defaultYear} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Velg år" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
