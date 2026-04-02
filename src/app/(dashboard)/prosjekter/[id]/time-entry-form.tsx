"use client"

import { useActionState, useState } from "react"
import { createTimeEntry, type TimeEntryFormState } from "@/actions/projects"
import { Loader2, Plus, X, Clock } from "lucide-react"

const inputClasses =
  "w-full px-4 py-3 rounded-lg border-slate-200 bg-white focus:ring-primary focus:border-primary transition-all text-sm text-slate-900 placeholder:text-slate-400"

const labelClasses = "text-sm font-semibold text-slate-700"

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-sm text-red-600 mt-1">{messages[0]}</p>
}

export function TimeEntryButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createTimeEntry, {})

  const today = new Date().toISOString().split("T")[0]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-sm transition-all shadow-sm"
      >
        <Plus className="size-4" />
        Registrer timer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="size-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Registrer timer</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="size-5 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form action={formAction} className="p-6 space-y-5">
              <input type="hidden" name="projectId" value={projectId} />

              <div className="grid grid-cols-2 gap-4">
                {/* Dato */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="te-date" className={labelClasses}>
                    Dato *
                  </label>
                  <input
                    id="te-date"
                    name="date"
                    type="date"
                    defaultValue={today}
                    required
                    className={inputClasses}
                  />
                  <FieldError messages={state.errors?.date} />
                </div>

                {/* Timer */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="te-hours" className={labelClasses}>
                    Timer *
                  </label>
                  <input
                    id="te-hours"
                    name="hours"
                    type="number"
                    step="0.25"
                    min="0.25"
                    placeholder="f.eks. 7.5"
                    required
                    className={inputClasses}
                  />
                  <FieldError messages={state.errors?.hours} />
                </div>
              </div>

              {/* Beskrivelse */}
              <div className="flex flex-col gap-2">
                <label htmlFor="te-description" className={labelClasses}>
                  Beskrivelse
                </label>
                <input
                  id="te-description"
                  name="description"
                  type="text"
                  placeholder="Hva jobbet du med?"
                  className={inputClasses}
                />
                <FieldError messages={state.errors?.description} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Fakturerbar */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="te-billable" className={labelClasses}>
                    Fakturerbar
                  </label>
                  <select
                    id="te-billable"
                    name="billable"
                    defaultValue="true"
                    className={inputClasses}
                  >
                    <option value="true">Ja</option>
                    <option value="false">Nei</option>
                  </select>
                </div>

                {/* Timesats */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="te-hourlyRate" className={labelClasses}>
                    Timesats (kr/t)
                  </label>
                  <input
                    id="te-hourlyRate"
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Valgfritt"
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Form-level error */}
              {state.errors?._form && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                  <p className="text-sm text-red-600">
                    {state.errors._form[0]}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Lagrer...
                    </>
                  ) : (
                    <>
                      <Clock className="size-4" />
                      Registrer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
