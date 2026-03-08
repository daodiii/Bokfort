"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useTransition } from "react"
import { exportReportCsv } from "@/actions/reports"

export function CsvExportButton({
  data,
  headers,
  filename,
}: {
  data: Record<string, string | number>[]
  headers: string[]
  filename: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      const csv = await exportReportCsv(data, headers)
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  if (data.length === 0) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isPending}
    >
      <Download className="size-4" />
      {isPending ? "Eksporterer..." : "Eksporter CSV"}
    </Button>
  )
}
