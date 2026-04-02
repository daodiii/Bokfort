import { getCurrentTeam } from "@/lib/auth-utils"
import { SettingsForm } from "./settings-form"

export const metadata = {
  title: "Innstillinger | Bokfort",
}

export default async function SettingsPage() {
  const { team, role } = await getCurrentTeam()
  const isAdmin = role === "ADMIN"

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <h2 className="text-2xl font-bold text-slate-900">
          Innstillinger
        </h2>
        <p className="text-slate-500 mt-1">
          Administrer konto, firmaprofil og faktureringsinnstillinger.
        </p>
      </header>

      <SettingsForm
        team={{
          companyName: team.companyName ?? "",
          orgNumber: team.orgNumber ?? "",
          companyType: team.companyType ?? "ENK",
          address: team.address ?? "",
          postalCode: team.postalCode ?? "",
          city: team.city ?? "",
          bankAccount: team.bankAccount ?? "",
          logoUrl: team.logoUrl ?? "",
          invoiceNumberSeq: team.invoiceNumberSeq ?? 1,
          mvaRegistered: team.mvaRegistered ?? false,
        }}
        isAdmin={isAdmin}
      />
    </div>
  )
}
