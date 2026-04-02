"use client"

import { useActionState } from "react"
import {
  updateTeamSettings,
  type TeamSettingsFormState,
} from "@/actions/team"
import {
  Building2,
  Check,
  Mail,
  Bell,
  CreditCard,
  Camera,
  CheckCircle,
} from "lucide-react"
import { useState } from "react"

type TeamData = {
  companyName: string
  orgNumber: string
  companyType: string
  address: string
  postalCode: string
  city: string
  bankAccount: string
  logoUrl: string
  invoiceNumberSeq: number
  mvaRegistered: boolean
}

const initialState: TeamSettingsFormState = {}

export function SettingsForm({
  team,
  isAdmin,
}: {
  team: TeamData
  isAdmin: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    updateTeamSettings,
    initialState
  )
  const [mvaRegistered, setMvaRegistered] = useState(team.mvaRegistered)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [systemUpdates, setSystemUpdates] = useState(false)

  return (
    <form action={formAction}>
      {/* Hidden field for mvaRegistered since checkbox needs special handling */}
      <input type="hidden" name="mvaRegistered" value={String(mvaRegistered)} />

      <div className="space-y-12">
        {/* ===== Profile Settings Section ===== */}
        <section>
          <div className="flex items-center justify-between border-b border-slate-200 border-slate-100 pb-4 mb-6">
            <h3 className="text-xl font-bold">Profilinnstillinger</h3>
            {isAdmin && (
              <button
                type="submit"
                disabled={isPending}
                className="text-sm font-semibold text-[#11b661] hover:underline disabled:opacity-50"
              >
                {isPending ? "Lagrer..." : "Lagre endringer"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Profile picture */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <div className="size-32 rounded-full overflow-hidden border-4 border-white border-slate-100 shadow-lg">
                  {team.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.logoUrl}
                      alt="Firmalogo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <Building2 className="size-12 text-slate-400" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="absolute bottom-1 right-1 bg-[#11b661] text-white p-2 rounded-full shadow-md hover:scale-105 transition-transform"
                >
                  <Camera className="size-3.5" />
                </button>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700 text-slate-700">
                  Firmalogo
                </p>
                <p className="text-xs text-slate-500">
                  JPG, GIF eller PNG. Maks 1MB.
                </p>
              </div>
            </div>

            {/* Profile fields */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 text-slate-700">
                  Firmanavn
                </label>
                <input
                  name="companyName"
                  type="text"
                  defaultValue={team.companyName}
                  placeholder="Mitt Firma AS"
                  required
                  disabled={!isAdmin}
                  className="form-input rounded-lg border-slate-200 border-slate-100 bg-white bg-white focus:border-[#11b661] focus:ring-[#11b661]/20 disabled:opacity-50"
                />
                {state.errors?.companyName && (
                  <p className="text-xs text-red-500">
                    {state.errors.companyName[0]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 text-slate-700">
                  Organisasjonsnummer
                </label>
                <input
                  name="orgNumber"
                  type="text"
                  defaultValue={team.orgNumber}
                  placeholder="123 456 789"
                  disabled={!isAdmin}
                  className="form-input rounded-lg border-slate-200 border-slate-100 bg-white bg-white focus:border-[#11b661] focus:ring-[#11b661]/20 disabled:opacity-50"
                />
                {state.errors?.orgNumber && (
                  <p className="text-xs text-red-500">
                    {state.errors.orgNumber[0]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 text-slate-700">
                  Adresse
                </label>
                <input
                  name="address"
                  type="text"
                  defaultValue={team.address}
                  placeholder="Storgata 1"
                  disabled={!isAdmin}
                  className="form-input rounded-lg border-slate-200 border-slate-100 bg-white bg-white focus:border-[#11b661] focus:ring-[#11b661]/20 disabled:opacity-50"
                />
                {state.errors?.address && (
                  <p className="text-xs text-red-500">
                    {state.errors.address[0]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 text-slate-700">
                  Bankkontonummer
                </label>
                <input
                  name="bankAccount"
                  type="text"
                  defaultValue={team.bankAccount}
                  placeholder="1234 56 78901"
                  disabled={!isAdmin}
                  className="form-input rounded-lg border-slate-200 border-slate-100 bg-white bg-white focus:border-[#11b661] focus:ring-[#11b661]/20 disabled:opacity-50"
                />
                {state.errors?.bankAccount && (
                  <p className="text-xs text-red-500">
                    {state.errors.bankAccount[0]}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===== Company Details Section ===== */}
        <section>
          <div className="flex items-center justify-between border-b border-slate-200 border-slate-100 pb-4 mb-6">
            <h3 className="text-xl font-bold">Firmaopplysninger</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 text-slate-700">
                Selskapstype
              </label>
              <select
                name="companyType"
                defaultValue={team.companyType || "ENK"}
                disabled={!isAdmin}
                className="form-select rounded-lg border-slate-200 border-slate-100 bg-white bg-white focus:border-[#11b661] focus:ring-[#11b661]/20 disabled:opacity-50"
              >
                <option value="ENK">Enkeltpersonforetak (ENK)</option>
                <option value="AS">Aksjeselskap (AS)</option>
              </select>
              {state.errors?.companyType && (
                <p className="text-xs text-red-500">
                  {state.errors.companyType[0]}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 text-slate-700">
                Logo-URL
              </label>
              <input
                name="logoUrl"
                type="url"
                defaultValue={team.logoUrl}
                placeholder="https://eksempel.no/logo.png"
                disabled={!isAdmin}
                className="form-input rounded-lg border-slate-200 border-slate-100 bg-white bg-white focus:border-[#11b661] focus:ring-[#11b661]/20 disabled:opacity-50"
              />
              {state.errors?.logoUrl && (
                <p className="text-xs text-red-500">
                  {state.errors.logoUrl[0]}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 text-slate-700">
                Postnummer
              </label>
              <input
                name="postalCode"
                type="text"
                defaultValue={team.postalCode}
                placeholder="0001"
                disabled={!isAdmin}
                className="form-input rounded-lg border-slate-200 border-slate-100 bg-white bg-white focus:border-[#11b661] focus:ring-[#11b661]/20 disabled:opacity-50"
              />
              {state.errors?.postalCode && (
                <p className="text-xs text-red-500">
                  {state.errors.postalCode[0]}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 text-slate-700">
                Poststed
              </label>
              <input
                name="city"
                type="text"
                defaultValue={team.city}
                placeholder="Oslo"
                disabled={!isAdmin}
                className="form-input rounded-lg border-slate-200 border-slate-100 bg-white bg-white focus:border-[#11b661] focus:ring-[#11b661]/20 disabled:opacity-50"
              />
              {state.errors?.city && (
                <p className="text-xs text-red-500">
                  {state.errors.city[0]}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ===== Notifications Section ===== */}
        <section>
          <div className="flex items-center justify-between border-b border-slate-200 border-slate-100 pb-4 mb-6">
            <h3 className="text-xl font-bold">Varsler</h3>
          </div>

          <div className="space-y-4">
            {/* Email Alerts toggle */}
            <div className="flex items-center justify-between p-4 bg-white bg-white rounded-xl border border-slate-200 border-slate-100">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-[#11b661]/10 flex items-center justify-center text-[#11b661]">
                  <Mail className="size-5" />
                </div>
                <div>
                  <p className="font-semibold">E-postvarsler</p>
                  <p className="text-sm text-slate-500">
                    Motta varsler for fakturabetalinger og oppdateringer.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={emailAlerts}
                  onChange={() => setEmailAlerts(!emailAlerts)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#11b661]"></div>
              </label>
            </div>

            {/* System Updates toggle */}
            <div className="flex items-center justify-between p-4 bg-white bg-white rounded-xl border border-slate-200 border-slate-100">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-[#11b661]/10 flex items-center justify-center text-[#11b661]">
                  <Bell className="size-5" />
                </div>
                <div>
                  <p className="font-semibold">Systemoppdateringer</p>
                  <p className="text-sm text-slate-500">
                    Bli varslet om nye funksjoner og planlagt vedlikehold.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={systemUpdates}
                  onChange={() => setSystemUpdates(!systemUpdates)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#11b661]"></div>
              </label>
            </div>
          </div>
        </section>

        {/* ===== Plan & Billing / MVA Section ===== */}
        <section>
          <div className="flex items-center justify-between border-b border-slate-200 border-slate-100 pb-4 mb-6">
            <h3 className="text-xl font-bold">Abonnement og MVA</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Plan / MVA card (dark background) */}
            <div className="p-6 bg-slate-900 rounded-xl text-white">
              <div className="flex justify-between items-start mb-4">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                  MVA-status
                </p>
                <button
                  type="button"
                  onClick={() => isAdmin && setMvaRegistered(!mvaRegistered)}
                  disabled={!isAdmin}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    mvaRegistered
                      ? "bg-[#11b661] text-white"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {mvaRegistered ? "Registrert" : "Uregistrert"}
                </button>
              </div>
              <h4 className="text-2xl font-bold mb-1">
                {mvaRegistered ? "MVA-registrert" : "Ikke MVA-registrert"}
              </h4>
              <p className="text-3xl font-black text-[#11b661] mb-6">
                {mvaRegistered ? "25%" : "0%"}
                <span className="text-sm font-normal text-slate-400">
                  {mvaRegistered ? " alminnelig sats" : " ingen MVA"}
                </span>
              </p>

              {mvaRegistered && (
                <div className="space-y-2 mb-8">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="size-[18px] text-[#11b661]" />
                    Alminnelig sats: 25%
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="size-[18px] text-[#11b661]" />
                    Matvarer: 15%
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="size-[18px] text-[#11b661]" />
                    Persontransport, kino: 12%
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => isAdmin && setMvaRegistered(!mvaRegistered)}
                disabled={!isAdmin}
                className="w-full py-2.5 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                {mvaRegistered ? "Fjern MVA-registrering" : "Registrer for MVA"}
              </button>
            </div>

            {/* Invoice settings + Payment info */}
            <div className="space-y-4">
              {/* Invoice number */}
              <div className="p-5 border border-slate-200 border-slate-100 rounded-xl bg-white bg-white">
                <div className="flex justify-between items-center mb-4">
                  <p className="font-bold">Fakturainnstillinger</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 text-slate-700">
                    Fakturanummer starter fra
                  </label>
                  <input
                    name="invoiceNumberStart"
                    type="number"
                    min={1}
                    defaultValue={team.invoiceNumberSeq}
                    disabled={!isAdmin}
                    className="form-input rounded-lg border-slate-200 border-slate-100 bg-white bg-white focus:border-[#11b661] focus:ring-[#11b661]/20 disabled:opacity-50"
                  />
                  <p className="text-xs text-slate-500">
                    Neste faktura far dette nummeret
                  </p>
                  {state.errors?.invoiceNumberStart && (
                    <p className="text-xs text-red-500">
                      {state.errors.invoiceNumberStart[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* Bank account info card */}
              <div className="p-5 border border-slate-200 border-slate-100 rounded-xl bg-white bg-white">
                <p className="font-bold mb-4">Betalingsinformasjon</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center">
                    <CreditCard className="size-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {team.bankAccount
                        ? `Konto ****${team.bankAccount.slice(-4)}`
                        : "Ingen bankkonto registrert"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Vises pa fakturaer som betalingsinfo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== Bottom action bar ===== */}
      <div className="mt-16 pt-8 border-t border-slate-200 border-slate-100 flex justify-between items-center">
        <button
          type="reset"
          className="px-6 py-2 border border-slate-200 border-slate-100 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Forkast endringer
        </button>

        <div className="flex items-center gap-4">
          {state.success && (
            <p className="flex items-center gap-1.5 text-sm text-[#11b661]">
              <Check className="size-4" />
              Endringer lagret
            </p>
          )}

          {state.errors?._form && (
            <p className="text-sm text-red-500">{state.errors._form[0]}</p>
          )}

          {isAdmin && (
            <button
              type="submit"
              disabled={isPending}
              className="px-8 py-2 bg-[#11b661] text-white rounded-lg text-sm font-bold shadow-lg shadow-[#11b661]/20 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? "Lagrer..." : "Lagre alle innstillinger"}
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
