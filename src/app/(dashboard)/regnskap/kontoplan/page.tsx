import { getCurrentTeam } from "@/lib/auth-utils"
import { getAccounts, seedChartOfAccounts } from "@/actions/accounting"
import { BookOpen, Plus } from "lucide-react"
import { revalidatePath } from "next/cache"

export const metadata = {
  title: "Kontoplan | Bokført",
}

function AccountTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    ASSET: { label: "Eiendel", className: "bg-blue-50 text-blue-700" },
    LIABILITY: { label: "Gjeld", className: "bg-red-50 text-red-700" },
    EQUITY: { label: "Egenkapital", className: "bg-purple-50 text-purple-700" },
    REVENUE: { label: "Inntekt", className: "bg-emerald-50 text-emerald-700" },
    EXPENSE: { label: "Kostnad", className: "bg-amber-50 text-amber-700" },
  }

  const { label, className } = config[type] ?? { label: type, className: "bg-slate-50 text-slate-700" }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

export default async function KontoplanPage() {
  const { team } = await getCurrentTeam()
  const accounts = await getAccounts()

  // Group accounts by first digit (account class)
  const grouped = accounts.reduce<Record<string, typeof accounts>>((acc, account) => {
    const classDigit = account.code[0]
    const classNames: Record<string, string> = {
      "1": "1 – Eiendeler",
      "2": "2 – Egenkapital og gjeld",
      "3": "3 – Salgsinntekter",
      "4": "4 – Varekostnad",
      "5": "5 – Lønnskostnader",
      "6": "6 – Andre driftskostnader",
      "7": "7 – Andre driftskostnader",
      "8": "8 – Finansposter",
    }
    const key = classNames[classDigit] ?? `${classDigit} – Annet`
    if (!acc[key]) acc[key] = []
    acc[key].push(account)
    return acc
  }, {})

  async function handleSeed() {
    "use server"
    await seedChartOfAccounts()
    revalidatePath("/regnskap/kontoplan")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kontoplan</h1>
          <p className="text-slate-500 mt-1">
            NS 4102 standard kontoplan for norsk regnskap
          </p>
        </div>
      </div>

      {accounts.length === 0 && !team.chartSeeded && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <BookOpen className="size-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">
            Ingen kontoplan opprettet ennå
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4 max-w-md mx-auto">
            Opprett standard NS 4102 kontoplan med de vanligste kontoene for norske foretak.
            Du kan tilpasse kontoplanen etterpå.
          </p>
          <form action={handleSeed}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" />
              Opprett standard kontoplan
            </button>
          </form>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([className, classAccounts]) => (
            <div key={className} className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700">{className}</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-2.5 text-slate-500 font-medium w-24">Konto</th>
                    <th className="text-left px-5 py-2.5 text-slate-500 font-medium">Navn</th>
                    <th className="text-left px-5 py-2.5 text-slate-500 font-medium w-28">Type</th>
                    <th className="text-center px-5 py-2.5 text-slate-500 font-medium w-20">Aktiv</th>
                  </tr>
                </thead>
                <tbody>
                  {classAccounts.map((account) => (
                    <tr key={account.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-2.5 font-mono text-slate-700 font-medium">
                        {account.code}
                      </td>
                      <td className="px-5 py-2.5 text-slate-800">
                        {account.name}
                      </td>
                      <td className="px-5 py-2.5">
                        <AccountTypeBadge type={account.type} />
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <span className={`inline-block size-2 rounded-full ${account.isActive ? "bg-emerald-400" : "bg-slate-300"}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <p className="text-sm text-slate-400 text-center">
            {accounts.length} kontoer totalt
          </p>
        </div>
      )}
    </div>
  )
}
