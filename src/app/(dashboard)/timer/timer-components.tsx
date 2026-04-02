"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import {
  createTimeEntry,
  deleteTimeEntry,
  type TimeEntryState,
} from "@/actions/time-entries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Plus,
  Trash2,
  Check,
  Loader2,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

// ── Types ────────────────────────────────────────────────────────────

type Project = {
  id: string
  name: string
  color: string
}

type TimeEntryRow = {
  id: string
  description: string | null
  date: Date | string
  hours: number
  billable: boolean
  hourlyRate: number | null
  project: Project
}

type WeekDay = {
  date: Date | string
  dayName: string
  dayShort: string
  entries: TimeEntryRow[]
  totalHours: number
}

type WeeklySummary = {
  weekStart: Date | string
  weekEnd: Date | string
  days: WeekDay[]
  totalHours: number
}

// ── Quick Add Form ───────────────────────────────────────────────────

export function QuickAddForm({ projects }: { projects: Project[] }) {
  const [state, formAction] = useActionState<TimeEntryState, FormData>(
    createTimeEntry,
    {}
  )
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedProject, setSelectedProject] = useState("")
  const [billable, setBillable] = useState(true)

  // Today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    if (state.success) {
      toast.success("Timer registrert!")
      formRef.current?.reset()
      setSelectedProject("")
      setBillable(true)
    }
    if (state.errors?._form) {
      toast.error(state.errors._form[0])
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formData.set("billable", String(billable))
        if (selectedProject) {
          formData.set("projectId", selectedProject)
        }
        startTransition(() => formAction(formData))
      }}
      className="bg-white rounded-xl border border-slate-100 shadow-sm p-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Project */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Prosjekt
          </Label>
          <Select
            value={selectedProject}
            onValueChange={(value) => setSelectedProject(value ?? "")}
          >
            <SelectTrigger className="w-full h-10 bg-slate-50 border-slate-200 hover:border-primary/50 transition-colors">
              <SelectValue placeholder="Velg prosjekt..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span
                    className="inline-block size-2.5 rounded-full mr-1.5 shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="projectId" value={selectedProject} />
          {state.errors?.projectId && (
            <p className="text-xs text-red-500">{state.errors.projectId[0]}</p>
          )}
        </div>

        {/* Date */}
        <div className="w-full lg:w-40 space-y-1.5">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Dato
          </Label>
          <Input
            type="date"
            name="date"
            defaultValue={today}
            className="h-10 bg-slate-50 border-slate-200 hover:border-primary/50 transition-colors"
          />
          {state.errors?.date && (
            <p className="text-xs text-red-500">{state.errors.date[0]}</p>
          )}
        </div>

        {/* Hours */}
        <div className="w-full lg:w-28 space-y-1.5">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Timer
          </Label>
          <Input
            type="number"
            name="hours"
            step="0.25"
            min="0.25"
            max="24"
            placeholder="0,0"
            className="h-10 bg-slate-50 border-slate-200 hover:border-primary/50 transition-colors"
          />
          {state.errors?.hours && (
            <p className="text-xs text-red-500">{state.errors.hours[0]}</p>
          )}
        </div>

        {/* Description */}
        <div className="flex-[2] min-w-0 space-y-1.5">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Beskrivelse
          </Label>
          <Input
            type="text"
            name="description"
            placeholder="Hva jobbet du med?"
            className="h-10 bg-slate-50 border-slate-200 hover:border-primary/50 transition-colors"
          />
        </div>

        {/* Billable Toggle */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Fakturerbar
          </Label>
          <button
            type="button"
            onClick={() => setBillable(!billable)}
            className={`
              h-10 px-4 rounded-lg border text-sm font-medium transition-all flex items-center gap-2
              ${
                billable
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }
            `}
          >
            <div
              className={`size-4 rounded-md border-2 flex items-center justify-center transition-all ${
                billable
                  ? "bg-primary border-primary"
                  : "border-slate-300 bg-white"
              }`}
            >
              {billable && <Check className="size-3 text-white" />}
            </div>
            {billable ? "Ja" : "Nei"}
          </button>
        </div>

        {/* Submit */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider lg:invisible">
            &nbsp;
          </Label>
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 px-6 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-bold shadow-sm shadow-primary/20 w-full lg:w-auto"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Plus className="size-4 mr-1.5" />
                Registrer
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ── Week Navigator ───────────────────────────────────────────────────

function formatWeekRange(start: Date | string, end: Date | string) {
  const s = new Date(start)
  const e = new Date(end)
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "mai",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "des",
  ]

  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}. - ${e.getDate()}. ${months[s.getMonth()]} ${s.getFullYear()}`
  }
  return `${s.getDate()}. ${months[s.getMonth()]} - ${e.getDate()}. ${months[e.getMonth()]} ${s.getFullYear()}`
}

export function WeeklyView({ summary }: { summary: WeeklySummary }) {
  // Collect unique projects
  const projectMap = new Map<string, Project>()
  for (const day of summary.days) {
    for (const entry of day.entries) {
      if (!projectMap.has(entry.project.id)) {
        projectMap.set(entry.project.id, entry.project)
      }
    }
  }
  const projects = Array.from(projectMap.values())

  // Find the max hours for any day to scale bars
  const maxHours = Math.max(
    ...summary.days.map((d) => d.totalHours),
    8 // minimum scale
  )

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h4 className="font-bold text-lg">Ukesoversikt</h4>
        <span className="text-sm text-slate-500">
          {formatWeekRange(summary.weekStart, summary.weekEnd)}
        </span>
      </div>

      <div className="p-6">
        {/* Timesheet grid */}
        <div className="grid grid-cols-7 gap-3">
          {summary.days.map((day) => {
            const dateObj = new Date(day.date)
            const isToday =
              dateObj.toDateString() === new Date().toDateString()
            const barHeight =
              day.totalHours > 0
                ? Math.max((day.totalHours / maxHours) * 120, 12)
                : 0

            return (
              <div key={day.dayShort} className="flex flex-col items-center">
                {/* Day label */}
                <span
                  className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                    isToday ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {day.dayShort}
                </span>

                {/* Date */}
                <span
                  className={`text-xs mb-3 ${
                    isToday
                      ? "bg-primary text-white size-6 rounded-full flex items-center justify-center font-bold"
                      : "text-slate-500"
                  }`}
                >
                  {dateObj.getDate()}
                </span>

                {/* Stacked bar */}
                <div
                  className="w-full flex flex-col-reverse gap-0.5 rounded-lg overflow-hidden"
                  style={{ height: 120 }}
                >
                  {day.entries.length > 0 ? (
                    day.entries.map((entry) => {
                      const h = Math.max(
                        (entry.hours / maxHours) * 120,
                        6
                      )
                      return (
                        <div
                          key={entry.id}
                          className="w-full rounded-sm transition-all hover:opacity-80"
                          style={{
                            height: h,
                            backgroundColor: entry.project.color,
                            opacity: 0.85,
                          }}
                          title={`${entry.project.name}: ${entry.hours}t${entry.description ? ` - ${entry.description}` : ""}`}
                        />
                      )
                    })
                  ) : (
                    <div className="w-full h-full flex items-end">
                      <div className="w-full h-1 rounded-full bg-slate-100" />
                    </div>
                  )}
                </div>

                {/* Hours total */}
                <span
                  className={`mt-2 text-sm font-bold ${
                    day.totalHours > 0 ? "text-slate-700" : "text-slate-300"
                  }`}
                >
                  {day.totalHours > 0 ? `${day.totalHours}t` : "-"}
                </span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        {projects.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-4">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span
                  className="size-3 rounded-sm"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-slate-600">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Week total footer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">Totalt denne uken</span>
        <span className="text-lg font-bold text-primary">
          {summary.totalHours}t
        </span>
      </div>
    </div>
  )
}

// ── Delete Confirmation ──────────────────────────────────────────────

function DeleteTimeEntryButton({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-rose-500 transition-colors" />
        }
      >
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slett tidsregistrering</DialogTitle>
          <DialogDescription>
            Er du sikker på at du vil slette denne tidsregistreringen? Denne
            handlingen kan ikke angres.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" />}
          >
            Avbryt
          </DialogClose>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await deleteTimeEntry(entryId)
                if (result.error) {
                  toast.error(result.error)
                } else {
                  toast.success("Tidsregistrering slettet")
                }
              })
            }}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <Trash2 className="size-4 mr-1.5" />
            )}
            Slett
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Time Entries Table ───────────────────────────────────────────────

export function TimeEntriesTable({ entries }: { entries: TimeEntryRow[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h4 className="font-bold text-lg">Siste registreringer</h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Dato</th>
              <th className="px-6 py-4">Prosjekt</th>
              <th className="px-6 py-4">Beskrivelse</th>
              <th className="px-6 py-4 text-right">Timer</th>
              <th className="px-6 py-4 text-center">Fakturerbar</th>
              <th className="px-6 py-4 text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-slate-50 transition-colors group"
              >
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  {formatDate(entry.date)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.project.color }}
                    />
                    <span className="text-sm font-semibold">
                      {entry.project.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                  {entry.description || (
                    <span className="text-slate-300 italic">Ingen beskrivelse</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-right tabular-nums">
                  {entry.hours}t
                </td>
                <td className="px-6 py-4 text-center">
                  {entry.billable ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                      <Check className="size-3" />
                      Ja
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400">
                      Nei
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteTimeEntryButton entryId={entry.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Viser {entries.length} registreringer
        </p>
        <p className="text-sm font-bold">
          Totalt:{" "}
          <span className="text-primary">
            {entries.reduce((s, e) => s + e.hours, 0)}t
          </span>
        </p>
      </div>
    </div>
  )
}
