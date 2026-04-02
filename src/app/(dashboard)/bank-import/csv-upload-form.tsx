"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { importCsv, type ImportCsvState } from "@/actions/bank-import"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Upload, Loader2 } from "lucide-react"

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
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      {state.errors?._form && (
        <div className="w-full rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.errors._form[0]}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="csvFile" className="text-sm font-medium">
          CSV-fil fra banken
        </Label>
        <Input
          id="csvFile"
          name="csvFile"
          type="file"
          accept=".csv"
          required
          className="cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
        />
      </div>

      <div>
        <Button type="submit" disabled={isPending} size="lg">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Importerer...
            </>
          ) : (
            <>
              <Upload className="size-4" />
              Importer
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
