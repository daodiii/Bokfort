import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatCurrency, formatOrgNumber } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Plus,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react"
import Link from "next/link"
import { CustomerSearch } from "./customer-search"

export const metadata = {
  title: "Kunder | Bokf\u00f8rt",
}

const ITEMS_PER_PAGE = 10

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default async function KunderPage({
  searchParams,
}: {
  searchParams: Promise<{ sok?: string; side?: string }>
}) {
  const { team } = await getCurrentTeam()
  const params = await searchParams
  const search = params.sok ?? ""
  const currentPage = Math.max(1, parseInt(params.side ?? "1", 10) || 1)

  const where = {
    teamId: team.id,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { orgNumber: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [totalCount, customers] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        invoices: {
          select: {
            total: true,
            status: true,
          },
        },
      },
    }),
  ])

  // Stats: total customers (no filter), active (have at least one SENT/PAID invoice), new this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalCustomers, newThisMonth, activeClients] = await Promise.all([
    db.customer.count({ where: { teamId: team.id } }),
    db.customer.count({
      where: { teamId: team.id, createdAt: { gte: startOfMonth } },
    }),
    db.customer.count({
      where: {
        teamId: team.id,
        invoices: {
          some: {
            status: { in: ["SENT", "PAID"] },
          },
        },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE))
  const hasCustomers = customers.length > 0
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  function buildPageUrl(page: number) {
    const p = new URLSearchParams()
    if (search) p.set("sok", search)
    if (page > 1) p.set("side", String(page))
    const qs = p.toString()
    return `/kunder${qs ? `?${qs}` : ""}`
  }

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kunder</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Administrer kundene dine og deres finansprofiler
          </p>
        </div>
        <Link
          href="/kunder/ny"
          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-all shadow-sm"
        >
          <UserPlus className="size-5" />
          <span>Legg til ny kunde</span>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Totalt kunder
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {totalCustomers.toLocaleString("nb-NO")}
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Aktive kunder
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserCheck className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {activeClients.toLocaleString("nb-NO")}
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Nye denne m\u00e5neden
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {newThisMonth.toLocaleString("nb-NO")}
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <CustomerSearch defaultValue={search} />
      </div>

      {/* Data Table Container */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
        {hasCustomers ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Navn
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Selskap
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      E-post
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                      Total omsetning
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customers.map((customer, index) => {
                    const totalRevenue = customer.invoices.reduce(
                      (sum, inv) => sum + inv.total,
                      0
                    )
                    const isActive = customer.invoices.some(
                      (inv) => inv.status === "SENT" || inv.status === "PAID"
                    )
                    const initials = getInitials(customer.name)

                    return (
                      <tr
                        key={customer.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/kunder/${customer.id}`}
                            className="flex items-center gap-3 group"
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
                              }`}
                            >
                              {initials}
                            </div>
                            <span className="font-semibold text-sm group-hover:underline">
                              {customer.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {customer.orgNumber
                            ? formatOrgNumber(customer.orgNumber)
                            : "\u2013"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {customer.email ?? "\u2013"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">
                          {formatCurrency(totalRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              Aktiv
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              Inaktiv
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            href={`/kunder/${customer.id}`}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <EllipsisVertical className="size-5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Viser {showingFrom} til {showingTo} av{" "}
                {totalCount.toLocaleString("nb-NO")} oppf\u00f8ringer
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildPageUrl(currentPage - 1)}
                    className="p-1.5 rounded-lg border border-slate-100 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="size-4" />
                  </Link>
                ) : (
                  <span className="p-1.5 rounded-lg border border-slate-100 text-slate-400 opacity-50 cursor-not-allowed">
                    <ChevronLeft className="size-4" />
                  </span>
                )}
                {currentPage < totalPages ? (
                  <Link
                    href={buildPageUrl(currentPage + 1)}
                    className="p-1.5 rounded-lg border border-slate-100 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                ) : (
                  <span className="p-1.5 rounded-lg border border-slate-100 text-slate-400 opacity-50 cursor-not-allowed">
                    <ChevronRight className="size-4" />
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Users className="size-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">
              {search ? "Ingen treff" : "Ingen kunder enn\u00e5"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {search
                ? "Pr\u00f8v \u00e5 endre s\u00f8ket ditt."
                : "Opprett din f\u00f8rste kunde for \u00e5 komme i gang med fakturering."}
            </p>
            {!search && (
              <Link
                href="/kunder/ny"
                className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-all shadow-sm"
              >
                <Plus className="size-4" />
                Ny kunde
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}
