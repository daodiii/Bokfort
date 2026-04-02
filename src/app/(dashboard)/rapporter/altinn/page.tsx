import { getCurrentTeam } from "@/lib/auth-utils"
import { getAvailablePayrollPeriods } from "@/actions/altinn-export"
import { AltinnExportClient } from "./altinn-export-client"

export const metadata = {
  title: "Altinn-innsending | Bokført",
}

export default async function AltinnPage() {
  const { team } = await getCurrentTeam()
  const payrollPeriods = await getAvailablePayrollPeriods()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentTermin = Math.ceil(currentMonth / 2)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Altinn-innsending
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Generer og last ned filer for innsending til Altinn
        </p>
      </div>

      <AltinnExportClient
        orgNumber={team.orgNumber}
        mvaRegistered={team.mvaRegistered}
        payrollPeriods={payrollPeriods}
        currentYear={currentYear}
        currentTermin={currentTermin}
      />
    </div>
  )
}
