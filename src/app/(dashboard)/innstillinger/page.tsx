import { getCurrentTeam } from "@/lib/auth-utils"
import { SettingsForm } from "./settings-form"

export const metadata = {
  title: "Innstillinger | Bokført",
}

export default async function SettingsPage() {
  const { team, role } = await getCurrentTeam()
  const isAdmin = role === "ADMIN"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Innstillinger</h1>
        <p className="text-muted-foreground">
          Administrer firma- og fakturainnstillinger
        </p>
      </div>

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
