import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { LonnTabs } from "./payroll-client"

export const metadata = {
  title: "Lønn og ansatte | Bokført",
}

export default async function LonnPage() {
  const { team } = await getCurrentTeam()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentPeriod = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [payrollRuns, employees] = await Promise.all([
    db.payrollRun.findMany({
      where: { teamId: team.id },
      orderBy: { period: "desc" },
    }),
    db.employee.findMany({
      where: { teamId: team.id },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
  ])

  // Calculate total paid this year
  const paidThisYear = payrollRuns
    .filter(
      (r) =>
        r.status === "PAID" && r.period.startsWith(String(currentYear))
    )
    .reduce((sum, r) => sum + r.totalNet, 0)

  const activeCount = employees.filter((e) => e.isActive).length

  // Serialize dates to strings for the client component
  const serializedRuns = payrollRuns.map((r) => ({
    id: r.id,
    period: r.period,
    status: r.status,
    totalGross: r.totalGross,
    totalTax: r.totalTax,
    totalNet: r.totalNet,
    totalPension: r.totalPension,
    createdAt: r.createdAt.toISOString(),
  }))

  const serializedEmployees = employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    position: e.position,
    department: e.department,
    monthlySalary: e.monthlySalary,
    startDate: e.startDate.toISOString(),
    isActive: e.isActive,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Lønn og ansatte
        </h2>
        <p className="text-slate-500 text-sm">
          Administrer ansatte og kjør lønnsbehandling
        </p>
      </div>

      <LonnTabs
        payrollRuns={serializedRuns}
        employees={serializedEmployees}
        paidThisYear={paidThisYear}
        activeCount={activeCount}
        currentPeriod={currentPeriod}
      />
    </div>
  )
}
