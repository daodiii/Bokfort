import { getCurrentTeam } from "@/lib/auth-utils"
import { FileDown } from "lucide-react"
import Link from "next/link"
import { SaftExportForm } from "./saft-export-form"

export const metadata = {
  title: "SAF-T Eksport | Bokført",
}

export default async function SaftExportPage() {
  const { team } = await getCurrentTeam()

  if (!team.chartSeeded) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">SAF-T Eksport</h1>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <FileDown className="size-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">Kontoplan må opprettes først</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            SAF-T krever en kontoplan med NS 4102 standardkontoer.
          </p>
          <Link
            href="/regnskap/kontoplan"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Sett opp kontoplan
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SAF-T Eksport</h1>
        <p className="text-slate-500 mt-1">
          Generer SAF-T Financial v1.30 XML-fil for innlevering til Skatteetaten.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Om SAF-T</h2>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>Standard Audit File - Tax (SAF-T) er et XML-format for utveksling av regnskapsdata.</li>
            <li>Obligatorisk for virksomheter med omsetning over 5 millioner NOK.</li>
            <li>Leveres kun ved bokettersyn (revisjon) fra Skatteetaten via Altinn.</li>
            <li>Denne eksporten følger SAF-T Financial v1.30 (gjeldende fra 1. januar 2025).</li>
          </ul>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Filen inneholder:</h3>
          <ul className="text-sm text-slate-500 space-y-0.5 list-disc list-inside">
            <li>Kontoplan med NS 4102 standardkontoer</li>
            <li>Alle bilag (journal entries) med debet/kredit</li>
            <li>Kundedata</li>
            <li>MVA-koder med Skatteetaten-standardkoder</li>
          </ul>
        </div>
      </div>

      <SaftExportForm />
    </div>
  )
}
