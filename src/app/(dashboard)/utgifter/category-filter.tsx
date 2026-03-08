"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

type Category = {
  id: string
  name: string
}

export function CategoryFilter({
  categories,
  defaultValue,
}: {
  categories: Category[]
  defaultValue: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleChange(value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "alle") {
      params.set("kategori", value)
    } else {
      params.delete("kategori")
    }
    startTransition(() => {
      router.replace(`/utgifter?${params.toString()}`)
    })
  }

  return (
    <Select
      defaultValue={defaultValue || "alle"}
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Alle kategorier" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="alle">Alle kategorier</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
