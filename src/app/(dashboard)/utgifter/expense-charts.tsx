"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition, useEffect, useRef } from "react"

type CategoryBreakdown = {
  name: string
  amount: number
  color: string
}

// ── Donut Chart (CSS border-based, matching design reference) ───────────────

export function SpendingDonut({
  categories,
  totalLabel,
}: {
  categories: CategoryBreakdown[]
  totalLabel: string
}) {
  const size = 160
  const strokeWidth = 28
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = categories.reduce((s, c) => s + c.amount, 0)

  // Build cumulative offset arcs
  let cumulative = 0
  const arcs = categories.map((cat) => {
    const pct = total > 0 ? cat.amount / total : 0
    const offset = cumulative
    cumulative += pct
    return { ...cat, pct, offset }
  })

  return (
    <>
      <div className="relative flex-1 flex items-center justify-center min-h-[250px]">
        {/* SVG donut ring */}
        <div className="relative">
          <svg
            width={size + 32}
            height={size + 32}
            viewBox={`0 0 ${size + 32} ${size + 32}`}
            className="rotate-[-90deg]"
          >
            {/* background ring */}
            <circle
              cx={(size + 32) / 2}
              cy={(size + 32) / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeWidth={strokeWidth}
            />
            {/* data arcs */}
            {arcs.map((arc, i) => (
              <circle
                key={i}
                cx={(size + 32) / 2}
                cy={(size + 32) / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${arc.pct * circumference} ${circumference}`}
                strokeDashoffset={-arc.offset * circumference}
                strokeLinecap="butt"
                className="transition-all duration-500"
              />
            ))}
          </svg>
          {/* centre label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-black leading-none">{totalLabel}</p>
            <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Totalt</p>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-6 space-y-3">
        {categories.map((cat, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
            </div>
            <span className="font-bold">{cat.amount.toLocaleString("nb-NO")} kr</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Weekly / Daily Bar Chart (matching design reference) ────────────────────

type BarData = {
  label: string
  value: number
}

export function WeeklyTrendChart({
  weeklyData,
  dailyData,
}: {
  weeklyData: BarData[]
  dailyData: BarData[]
}) {
  const [mode, setMode] = useState<"weekly" | "daily">("weekly")
  const data = mode === "weekly" ? weeklyData : dailyData
  const maxVal = Math.max(...data.map((d) => d.value), 1)

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h4 className="font-bold text-lg">Ukentlig trend</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("daily")}
            className={`px-3 py-1 text-xs font-bold rounded-md ${
              mode === "daily"
                ? "bg-primary text-white"
                : "bg-slate-100 dark:bg-slate-800"
            }`}
          >
            Daglig
          </button>
          <button
            onClick={() => setMode("weekly")}
            className={`px-3 py-1 text-xs font-bold rounded-md ${
              mode === "weekly"
                ? "bg-primary text-white"
                : "bg-slate-100 dark:bg-slate-800"
            }`}
          >
            Ukentlig
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-end justify-between gap-4 pb-4">
        {data.map((bar, i) => {
          const heightPct = maxVal > 0 ? (bar.value / maxVal) * 100 : 0
          const isTallest = bar.value === maxVal && bar.value > 0
          return (
            <div
              key={`${mode}-${i}`}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative h-48">
                <div
                  className={`absolute bottom-0 w-full rounded-t-lg transition-all ${
                    isTallest
                      ? "bg-primary"
                      : "bg-primary/20 group-hover:bg-primary/30"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {bar.label}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Transaction Search ──────────────────────────────────────────────────────

export function TransactionSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = defaultValue
    }
  }, [defaultValue])

  function handleChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) {
        params.set("sok", value.trim())
      } else {
        params.delete("sok")
      }
      startTransition(() => {
        router.replace(`/utgifter?${params.toString()}`)
      })
    }, 300)
  }

  return (
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Sok transaksjoner..."
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full pl-10 pr-4 py-1.5 text-sm rounded-lg border-slate-200 dark:border-slate-800 dark:bg-slate-800 focus:ring-primary focus:border-primary"
      />
    </div>
  )
}
