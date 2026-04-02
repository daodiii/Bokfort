"use client"

import { useState } from "react"
import { exportSaftXml } from "@/actions/saft-export"
import { FileDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export function SaftExportForm() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleExport() {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await exportSaftXml({ fiscalYear: year })

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.xml && result.filename) {
        // Create and download the XML file
        const blob = new Blob([result.xml], { type: "application/xml;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setSuccess(true)
      }
    } catch {
      setError("Noe gikk galt under eksport. Vennligst prøv igjen.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Generer SAF-T fil</h2>

      <div>
        <label htmlFor="fiscal-year" className="block text-sm font-medium text-slate-700 mb-1">
          Regnskapsår
        </label>
        <select
          id="fiscal-year"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {Array.from({ length: 5 }, (_, i) => currentYear - i).map((yr) => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          SAF-T fil generert og lastet ned.
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileDown className="size-4" />
        )}
        {loading ? "Genererer..." : "Last ned SAF-T XML"}
      </button>
    </div>
  )
}
