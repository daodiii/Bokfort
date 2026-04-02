"use client"

import { useActionState, useState, useTransition } from "react"
import { lookupBrreg, type CustomerFormState } from "@/actions/customers"
import { ArrowLeft, Loader2, Search, UserPlus } from "lucide-react"
import Link from "next/link"

type CustomerFormProps = {
  action: (prevState: CustomerFormState, formData: FormData) => Promise<CustomerFormState>
  defaultValues?: {
    name?: string
    email?: string
    phone?: string
    orgNumber?: string
    address?: string
    city?: string
    postalCode?: string
  }
  submitLabel: string
  title?: string
}

const inputClasses =
  "w-full px-4 py-3 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-primary focus:border-primary transition-all text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"

const labelClasses = "text-sm font-semibold text-slate-700 dark:text-slate-300"

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-sm text-red-600 dark:text-red-400 mt-1">{messages[0]}</p>
}

export function CustomerForm({
  action,
  defaultValues,
  submitLabel,
  title,
}: CustomerFormProps) {
  const [state, formAction, isPending] = useActionState(action, {})
  const [brregPending, startBrregTransition] = useTransition()
  const [brregError, setBrregError] = useState<string | null>(null)

  // Local state for fields that can be auto-filled
  const [name, setName] = useState(defaultValues?.name ?? "")
  const [email, setEmail] = useState(defaultValues?.email ?? "")
  const [phone, setPhone] = useState(defaultValues?.phone ?? "")
  const [orgNumber, setOrgNumber] = useState(defaultValues?.orgNumber ?? "")
  const [address, setAddress] = useState(defaultValues?.address ?? "")
  const [city, setCity] = useState(defaultValues?.city ?? "")
  const [postalCode, setPostalCode] = useState(defaultValues?.postalCode ?? "")

  function handleBrregLookup() {
    setBrregError(null)
    startBrregTransition(async () => {
      const result = await lookupBrreg(orgNumber)
      if (result.success && result.data) {
        setName(result.data.name)
        setOrgNumber(result.data.orgNumber)
        if (result.data.address) setAddress(result.data.address)
        if (result.data.postalCode) setPostalCode(result.data.postalCode)
        if (result.data.city) setCity(result.data.city)
      } else {
        setBrregError(result.error ?? "Oppslag feilet.")
      }
    })
  }

  const pageTitle = title ?? "Legg til ny kunde"
  const pageDescription = title
    ? undefined
    : "Opprett en omfattende profil for din nye kunde."

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {pageTitle}
          </h2>
          {pageDescription && (
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {pageDescription}
            </p>
          )}
        </div>
        <Link
          href="/kunder"
          className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm font-medium">Tilbake til listen</span>
        </Link>
      </div>

      {/* Form Section */}
      <form action={formAction} className="space-y-8">
        {/* General Information Group */}
        <section className="bg-[#f6f8f7]/30 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-6">
            Generell informasjon
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fullt navn */}
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className={labelClasses}>
                Fullt navn *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="f.eks. Ola Nordmann"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClasses}
              />
              <FieldError messages={state.errors?.name} />
            </div>

            {/* Organisasjonsnummer */}
            <div className="flex flex-col gap-2">
              <label htmlFor="orgNumber" className={labelClasses}>
                Organisasjonsnummer
              </label>
              <div className="flex gap-2">
                <input
                  id="orgNumber"
                  name="orgNumber"
                  type="text"
                  placeholder="123 456 789"
                  value={orgNumber}
                  onChange={(e) => setOrgNumber(e.target.value)}
                  className={inputClasses}
                />
                <button
                  type="button"
                  onClick={handleBrregLookup}
                  disabled={brregPending || orgNumber.replace(/\s/g, "").length < 9}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {brregPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  <span className="hidden sm:inline">Sla opp</span>
                </button>
              </div>
              <FieldError messages={state.errors?.orgNumber} />
              {brregError && (
                <p className="text-sm text-red-600 dark:text-red-400">{brregError}</p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sla opp i Bronnoysundregistrene for a fylle ut automatisk
              </p>
            </div>

            {/* E-postadresse */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className={labelClasses}>
                E-postadresse
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="kunde@eksempel.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
              />
              <FieldError messages={state.errors?.email} />
            </div>

            {/* Telefonnummer */}
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className={labelClasses}>
                Telefonnummer
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+47 12 34 56 78"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClasses}
              />
              <FieldError messages={state.errors?.phone} />
            </div>
          </div>
        </section>

        {/* Billing & Status Group */}
        <section className="bg-[#f6f8f7]/30 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-6">
            Fakturering og status
          </h3>
          <div className="grid grid-cols-1 gap-6">
            {/* Fakturaadresse */}
            <div className="flex flex-col gap-2">
              <label htmlFor="address" className={labelClasses}>
                Fakturaadresse
              </label>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="Gateadresse, leilighet, etasje"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClasses}
              />
              <FieldError messages={state.errors?.address} />
            </div>

            {/* Postnummer og Poststed */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="postalCode" className={labelClasses}>
                  Postnummer
                </label>
                <input
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  placeholder="0000"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className={inputClasses}
                />
                <FieldError messages={state.errors?.postalCode} />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label htmlFor="city" className={labelClasses}>
                  Poststed
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="Oslo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClasses}
                />
                <FieldError messages={state.errors?.city} />
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-2 w-full md:w-1/3">
              <label htmlFor="status" className={labelClasses}>
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="active"
                className={inputClasses}
              >
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
              </select>
            </div>
          </div>
        </section>

        {/* Additional Information Group */}
        <section className="bg-[#f6f8f7]/30 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-6">
            Tilleggsinformasjon
          </h3>
          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className={labelClasses}>
              Notater
            </label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Spesifikke detaljer eller krav for denne kunden..."
              rows={4}
              className={`${inputClasses} resize-none`}
            />
          </div>
        </section>

        {/* Form-level error */}
        {state.errors?._form && (
          <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{state.errors._form[0]}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/kunder"
            className="px-6 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
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
                Lagrer...
              </>
            ) : (
              <>
                <UserPlus className="size-4" />
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
