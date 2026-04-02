"use client"

import { useActionState } from "react"
import { createProject, type ProjectFormState } from "@/actions/projects"
import { ArrowLeft, Loader2, FolderPlus } from "lucide-react"
import Link from "next/link"

type ProjectFormProps = {
  customers: { id: string; name: string }[]
}

const PRESET_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f97316", // orange
  "#06b6d4", // cyan
]

const inputClasses =
  "w-full px-4 py-3 rounded-lg border-slate-200 bg-white focus:ring-primary focus:border-primary transition-all text-sm text-slate-900 placeholder:text-slate-400"

const labelClasses = "text-sm font-semibold text-slate-700"

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-sm text-red-600 mt-1">{messages[0]}</p>
}

export function ProjectForm({ customers }: ProjectFormProps) {
  const [state, formAction, isPending] = useActionState(createProject, {})

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Nytt prosjekt
          </h2>
          <p className="text-slate-500 mt-1">
            Opprett et prosjekt for å spore timer, utgifter og fakturering.
          </p>
        </div>
        <Link
          href="/prosjekter"
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm font-medium">Tilbake</span>
        </Link>
      </div>

      {/* Form Section */}
      <form action={formAction} className="space-y-8">
        {/* General Information */}
        <section className="bg-[#f6f8f7]/30 p-6 rounded-xl border border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-6">
            Prosjektdetaljer
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prosjektnavn */}
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className={labelClasses}>
                Prosjektnavn *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="f.eks. Nettside redesign"
                required
                className={inputClasses}
              />
              <FieldError messages={state.errors?.name} />
            </div>

            {/* Kunde */}
            <div className="flex flex-col gap-2">
              <label htmlFor="customerId" className={labelClasses}>
                Kunde (valgfritt)
              </label>
              <select
                id="customerId"
                name="customerId"
                className={inputClasses}
              >
                <option value="">Ingen kunde</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError messages={state.errors?.customerId} />
            </div>

            {/* Beskrivelse */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label htmlFor="description" className={labelClasses}>
                Beskrivelse
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Kort beskrivelse av prosjektet..."
                rows={3}
                className={`${inputClasses} resize-none`}
              />
              <FieldError messages={state.errors?.description} />
            </div>
          </div>
        </section>

        {/* Color Picker */}
        <section className="bg-[#f6f8f7]/30 p-6 rounded-xl border border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-6">
            Farge
          </h3>
          <div className="flex flex-wrap gap-3">
            {PRESET_COLORS.map((color, i) => (
              <label key={color} className="cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  value={color}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <div
                  className="size-10 rounded-xl border-2 border-transparent peer-checked:border-slate-900 peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-slate-300 transition-all hover:scale-110"
                  style={{ backgroundColor: color }}
                />
              </label>
            ))}
          </div>
        </section>

        {/* Budget & Rates */}
        <section className="bg-[#f6f8f7]/30 p-6 rounded-xl border border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-6">
            Budsjett og satser
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budsjett */}
            <div className="flex flex-col gap-2">
              <label htmlFor="budget" className={labelClasses}>
                Budsjett (kr)
              </label>
              <input
                id="budget"
                name="budget"
                type="number"
                step="0.01"
                min="0"
                placeholder="f.eks. 50000"
                className={inputClasses}
              />
              <p className="text-xs text-slate-500">
                Valgfritt. Sett et totalt budsjett for prosjektet.
              </p>
              <FieldError messages={state.errors?.budget} />
            </div>

            {/* Timesats */}
            <div className="flex flex-col gap-2">
              <label htmlFor="hourlyRate" className={labelClasses}>
                Standard timesats (kr/t)
              </label>
              <input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="f.eks. 1200"
                className={inputClasses}
              />
              <p className="text-xs text-slate-500">
                Valgfritt. Standardsats for timeregistreringer.
              </p>
              <FieldError messages={state.errors?.hourlyRate} />
            </div>
          </div>
        </section>

        {/* Form-level error */}
        {state.errors?._form && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-600">{state.errors._form[0]}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
          <Link
            href="/prosjekter"
            className="px-6 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Avbryt
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Oppretter...
              </>
            ) : (
              <>
                <FolderPlus className="size-4" />
                Opprett prosjekt
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
