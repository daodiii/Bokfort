import { getProjectById } from "@/actions/projects"
import { formatCurrency } from "@/lib/utils"
import {
  ArrowLeft,
  Clock,
  Receipt,
  FileText,
  Target,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { TimeEntryButton } from "./time-entry-form"
import { ProjectTabs } from "./project-tabs"

export const metadata = {
  title: "Prosjektdetaljer | Bokført",
}

export default async function ProsjektDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProjectById(id)

  if (!project) {
    notFound()
  }

  const budgetRemaining =
    project.budget != null ? project.budget - project.totalExpenses : null
  const billablePct =
    project.totalHours > 0
      ? Math.round((project.billableHours / project.totalHours) * 100)
      : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href="/prosjekter"
            className="mt-1 p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="size-5 text-slate-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div
                className="size-4 rounded-full shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <h2 className="text-2xl font-bold text-slate-900">
                {project.name}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  project.isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {project.isActive ? "Aktiv" : "Inaktiv"}
              </span>
            </div>
            {project.description && (
              <p className="text-slate-500 text-sm mt-1 ml-7">
                {project.description}
              </p>
            )}
            {project.customer && (
              <p className="text-slate-400 text-xs mt-1 ml-7">
                Kunde: {project.customer.name}
              </p>
            )}
          </div>
        </div>
        <TimeEntryButton projectId={project.id} />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">
              Totalt timer
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {project.totalHours.toFixed(1)}
            </span>
            <span className="text-sm text-slate-400">
              ({billablePct}% fakturerbar)
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">
              Utgifter
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Receipt className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {formatCurrency(project.totalExpenses)}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">
              Fakturert
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {formatCurrency(project.totalInvoiced)}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">
              {budgetRemaining !== null ? "Gjenstående budsjett" : "Budsjett"}
            </span>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold ${
                budgetRemaining !== null && budgetRemaining < 0
                  ? "text-red-600"
                  : ""
              }`}
            >
              {budgetRemaining !== null
                ? formatCurrency(budgetRemaining)
                : "–"}
            </span>
            {project.budget != null && (
              <span className="text-sm text-slate-400">
                av {formatCurrency(project.budget)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Budget Progress */}
      {project.budget != null && project.budget > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">
              Budsjettbruk
            </span>
            <span className="text-sm font-bold text-slate-700">
              {formatCurrency(project.totalExpenses)} /{" "}
              {formatCurrency(project.budget)}
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round((project.totalExpenses / project.budget) * 100))}%`,
                backgroundColor:
                  project.totalExpenses / project.budget > 0.9
                    ? "#ef4444"
                    : project.totalExpenses / project.budget > 0.7
                      ? "#f59e0b"
                      : project.color,
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <ProjectTabs
          timeEntries={project.timeEntries.map((e) => ({
            id: e.id,
            description: e.description,
            date: e.date,
            hours: e.hours,
            billable: e.billable,
            hourlyRate: e.hourlyRate,
            user: e.user,
          }))}
          expenses={project.expenses.map((e) => ({
            id: e.id,
            description: e.description,
            amount: e.amount,
            date: e.date,
            category: e.category,
          }))}
          invoices={project.invoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            total: inv.total,
            status: inv.status,
            issueDate: inv.issueDate,
            customer: inv.customer,
          }))}
        />
      </div>
    </div>
  )
}
