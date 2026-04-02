"use client"

import { useActionState } from "react"
import { updateEmployee, type EmployeeFormState } from "@/actions/employees"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import Link from "next/link"

type SerializedEmployee = {
  id: string
  name: string
  email: string
  phone: string
  personnummer: string
  position: string
  department: string
  startDate: string
  monthlySalary: number
  taxPercent: number
  pensionPercent: number
  bankAccount: string
}

const inputClasses =
  "w-full px-4 py-3 rounded-lg border-slate-200 bg-white focus:ring-primary focus:border-primary transition-all text-sm text-slate-900 placeholder:text-slate-400"

const labelClasses = "text-sm font-semibold text-slate-700"

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-sm text-red-600 mt-1">{messages[0]}</p>
}

export function EditEmployeeForm({
  employee,
}: {
  employee: SerializedEmployee
}) {
  const updateWithId = updateEmployee.bind(null, employee.id)
  const [state, formAction, isPending] = useActionState<EmployeeFormState, FormData>(
    updateWithId,
    {}
  )

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Rediger ansatt
          </h2>
          <p className="text-slate-500 mt-1">
            Oppdater informasjon for {employee.name}.
          </p>
        </div>
        <Link
          href="/lonn"
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm font-medium">Tilbake</span>
        </Link>
      </div>

      <form action={formAction} className="space-y-8">
        <section className="bg-[#f6f8f7]/30 p-6 rounded-xl border border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-6">
            Personlig informasjon
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className={labelClasses}>Fullt navn *</label>
              <input id="name" name="name" type="text" defaultValue={employee.name} required className={inputClasses} />
              <FieldError messages={state.errors?.name} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="personnummer" className={labelClasses}>Personnummer</label>
              <input id="personnummer" name="personnummer" type="text" defaultValue={employee.personnummer} placeholder="11 siffer" className={inputClasses} />
              <FieldError messages={state.errors?.personnummer} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className={labelClasses}>E-postadresse</label>
              <input id="email" name="email" type="email" defaultValue={employee.email} placeholder="ansatt@eksempel.no" className={inputClasses} />
              <FieldError messages={state.errors?.email} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className={labelClasses}>Telefonnummer</label>
              <input id="phone" name="phone" type="tel" defaultValue={employee.phone} placeholder="+47 12 34 56 78" className={inputClasses} />
              <FieldError messages={state.errors?.phone} />
            </div>
          </div>
        </section>

        <section className="bg-[#f6f8f7]/30 p-6 rounded-xl border border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-6">
            Ansettelsesdetaljer
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="position" className={labelClasses}>Stilling</label>
              <input id="position" name="position" type="text" defaultValue={employee.position} placeholder="f.eks. Utvikler" className={inputClasses} />
              <FieldError messages={state.errors?.position} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="department" className={labelClasses}>Avdeling</label>
              <input id="department" name="department" type="text" defaultValue={employee.department} placeholder="f.eks. Teknologi" className={inputClasses} />
              <FieldError messages={state.errors?.department} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="startDate" className={labelClasses}>Startdato *</label>
              <input id="startDate" name="startDate" type="date" defaultValue={employee.startDate} required className={inputClasses} />
              <FieldError messages={state.errors?.startDate} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="bankAccount" className={labelClasses}>Bankkonto</label>
              <input id="bankAccount" name="bankAccount" type="text" defaultValue={employee.bankAccount} placeholder="1234 56 78901" className={inputClasses} />
              <FieldError messages={state.errors?.bankAccount} />
            </div>
          </div>
        </section>

        <section className="bg-[#f6f8f7]/30 p-6 rounded-xl border border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-6">
            Loenn og skatt
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="monthlySalary" className={labelClasses}>Maanedsloenn (kr) *</label>
              <input id="monthlySalary" name="monthlySalary" type="number" step="1" min="0" defaultValue={employee.monthlySalary} required className={inputClasses} />
              <p className="text-xs text-slate-500">Brutto maanedsloenn i kroner</p>
              <FieldError messages={state.errors?.monthlySalary} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="taxPercent" className={labelClasses}>Skatteprosent (%)</label>
              <input id="taxPercent" name="taxPercent" type="number" step="0.1" min="0" max="100" defaultValue={employee.taxPercent} className={inputClasses} />
              <FieldError messages={state.errors?.taxPercent} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="pensionPercent" className={labelClasses}>Pensjonsprosent (%)</label>
              <input id="pensionPercent" name="pensionPercent" type="number" step="0.1" min="0" max="100" defaultValue={employee.pensionPercent} className={inputClasses} />
              <FieldError messages={state.errors?.pensionPercent} />
            </div>
          </div>
        </section>

        {state.errors?._form && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-600">{state.errors._form[0]}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
          <Link href="/lonn" className="px-6 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            Avbryt
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <><Loader2 className="size-4 animate-spin" />Lagrer...</>
            ) : (
              <><Save className="size-4" />Lagre endringer</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
