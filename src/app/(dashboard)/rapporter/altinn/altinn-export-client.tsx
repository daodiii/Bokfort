"use client"

import { useState, useTransition } from "react"
import { exportMvaMelding, exportAMelding } from "@/actions/altinn-export"
import {
  FileText,
  Download,
  AlertCircle,
  Building2,
  Receipt,
  Users,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

type Props = {
  orgNumber: string | null
  mvaRegistered: boolean
  payrollPeriods: string[]
  currentYear: number
  currentTermin: number
}

const TERMIN_LABELS: Record<number, string> = {
  1: "1. termin (jan-feb)",
  2: "2. termin (mar-apr)",
  3: "3. termin (mai-jun)",
  4: "4. termin (jul-aug)",
  5: "5. termin (sep-okt)",
  6: "6. termin (nov-des)",
}

function downloadXml(xml: string, filename: string) {
  const blob = new Blob([xml], { type: "application/xml" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AltinnExportClient({
  orgNumber,
  mvaRegistered,
  payrollPeriods,
  currentYear,
  currentTermin,
}: Props) {
  const [isPending, startTransition] = useTransition()

  // MVA state
  const [mvaYear, setMvaYear] = useState(currentYear)
  const [mvaTermin, setMvaTermin] = useState(currentTermin)

  // A-melding state
  const [ameldingPeriod, setAmeldingPeriod] = useState(
    payrollPeriods[0] ?? ""
  )

  function handleMvaExport() {
    startTransition(async () => {
      const result = await exportMvaMelding(mvaTermin, mvaYear)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.xml && result.filename) {
        downloadXml(result.xml, result.filename)
        toast.success(`MVA-melding lastet ned: ${result.filename}`)
      }
    })
  }

  function handleAmeldingExport() {
    if (!ameldingPeriod) {
      toast.error("Velg en periode")
      return
    }
    startTransition(async () => {
      const result = await exportAMelding(ameldingPeriod)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.xml && result.filename) {
        downloadXml(result.xml, result.filename)
        toast.success(`A-melding lastet ned: ${result.filename}`)
      }
    })
  }

  if (!orgNumber) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
        <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-amber-800">
            Organisasjonsnummer mangler
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            Du ma legge inn organisasjonsnummeret i innstillinger for a kunne
            generere Altinn-filer.
          </p>
        </div>
      </div>
    )
  }

  const years = Array.from({ length: 3 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
        <Building2 className="size-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-blue-800 text-sm">
            Innsending via Altinn
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Last ned XML-filene og last dem opp manuelt i{" "}
            <a
              href="https://www.altinn.no"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium inline-flex items-center gap-1"
            >
              Altinn.no
              <ExternalLink className="size-3" />
            </a>
            . Direkte API-integrasjon kommer i en fremtidig versjon.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* MVA-melding */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Receipt className="size-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">MVA-melding</h3>
              <p className="text-xs text-slate-500">
                Merverdiavgift — to-manedlig innrapportering
              </p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {!mvaRegistered ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertCircle className="size-4 shrink-0" />
                Virksomheten er ikke MVA-registrert
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Aar
                    </label>
                    <select
                      value={mvaYear}
                      onChange={(e) => setMvaYear(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:ring-primary focus:border-primary"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Termin
                    </label>
                    <select
                      value={mvaTermin}
                      onChange={(e) => setMvaTermin(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:ring-primary focus:border-primary"
                    >
                      {[1, 2, 3, 4, 5, 6].map((t) => (
                        <option key={t} value={t}>
                          {TERMIN_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleMvaExport}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                >
                  <Download className="size-4" />
                  {isPending ? "Genererer..." : "Last ned MVA-melding XML"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* A-melding */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="size-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">A-melding</h3>
              <p className="text-xs text-slate-500">
                Arbeidsgiver- og arbeidstakerregisteret — manedlig
              </p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {payrollPeriods.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertCircle className="size-4 shrink-0" />
                Ingen godkjente loennskjoeringer funnet
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Periode
                  </label>
                  <select
                    value={ameldingPeriod}
                    onChange={(e) => setAmeldingPeriod(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:ring-primary focus:border-primary"
                  >
                    {payrollPeriods.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAmeldingExport}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                >
                  <Download className="size-4" />
                  {isPending ? "Genererer..." : "Last ned A-melding XML"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Other reports link */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-slate-50 flex items-center justify-center">
            <FileText className="size-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Andre rapporter</h3>
            <p className="text-xs text-slate-500">
              SAF-T, arsregnskap og resultatrapport
            </p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="/regnskap/saft-export"
              className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-primary hover:text-primary transition-colors"
            >
              <FileText className="size-4" />
              SAF-T eksport
            </a>
            <a
              href="/rapporter/arsregnskap"
              className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-primary hover:text-primary transition-colors"
            >
              <FileText className="size-4" />
              Arsregnskap
            </a>
            <a
              href="/rapporter/resultat"
              className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-primary hover:text-primary transition-colors"
            >
              <FileText className="size-4" />
              Resultatrapport
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
