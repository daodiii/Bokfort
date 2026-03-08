"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { importCsv, type ImportCsvState } from "@/actions/bank-import"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

const initialState: ImportCsvState = {}

export function CsvUploadForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    importCsv,
    initialState
  )

  useEffect(() => {
    if (state.batchId) {
      router.push(`/bank-import/${state.batchId}`)
      router.refresh()
    }
  }, [state.batchId, router])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.errors?._form && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.errors._form[0]}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="csvFile">CSV-fil fra banken</Label>
        <Input
          id="csvFile"
          name="csvFile"
          type="file"
          accept=".csv"
          required
        />
      </div>

      <div>
        <Button type="submit" disabled={isPending}>
          <Upload className="size-4" />
          {isPending ? "Importerer..." : "Importer"}
        </Button>
      </div>
    </form>
  )
}
