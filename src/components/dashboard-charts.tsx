"use client"

import { useState } from "react"

// ─── Cash Flow Chart (SVG line chart with gradient fill) ────────────────────

type CashFlowDataPoint = {
  label: string
  income: number
  expense: number
}

export function CashFlowChart({
  data,
  formatAmount,
}: {
  data: CashFlowDataPoint[]
  formatAmount: (value: number) => string
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Ingen data tilgjengelig
      </div>
    )
  }

  // Calculate net values and chart dimensions
  const netValues = data.map((d) => d.income - d.expense)
  const maxVal = Math.max(...netValues, 1)
  const minVal = Math.min(...netValues, 0)
  const range = maxVal - minVal || 1

  const viewW = 800
  const viewH = 240
  const padTop = 20
  const padBottom = 10
  const chartH = viewH - padTop - padBottom

  // Generate points along the x axis
  const points = netValues.map((val, i) => {
    const x = data.length === 1 ? viewW / 2 : (i / (data.length - 1)) * viewW
    const y = padTop + chartH - ((val - minVal) / range) * chartH
    return { x, y }
  })

  // Build the smooth curve path
  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`
      const prev = points[i - 1]
      const cpx1 = prev.x + (p.x - prev.x) * 0.4
      const cpx2 = p.x - (p.x - prev.x) * 0.4
      return `C${cpx1},${prev.y} ${cpx2},${p.y} ${p.x},${p.y}`
    })
    .join(" ")

  // Area fill path (close to bottom)
  const areaPath = `${linePath} L${points[points.length - 1].x},${viewH} L${points[0].x},${viewH} Z`

  return (
    <div className="relative h-64 w-full">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="cashflow-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: "rgba(16, 185, 129, 0.2)", stopOpacity: 1 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "rgba(16, 185, 129, 0)", stopOpacity: 1 }}
            />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#cashflow-grad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#10b981"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 6 : 4}
              fill="white"
              stroke="#10b981"
              strokeWidth={2}
              className="transition-all duration-150"
            />
            {/* Invisible larger hit area */}
            <circle
              cx={p.x}
              cy={p.y}
              r={30}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            />
          </g>
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-4 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="pointer-events-none absolute rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(points[hoveredIndex].x / viewW) * 100}%`,
            top: `${(points[hoveredIndex].y / viewH) * 100 - 15}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-bold text-slate-900">
            {formatAmount(netValues[hoveredIndex])}
          </div>
          <div className="text-slate-500">{data[hoveredIndex].label}</div>
        </div>
      )}
    </div>
  )
}

// ─── Expense Categories Donut Chart (SVG) ───────────────────────────────────

type ExpenseCategoryData = {
  name: string
  amount: number
  percentage: number
  color: string
}

const CATEGORY_COLORS = [
  "#10b981", // primary green (matches HTML #10b981)
  "#94a3b8", // slate-400
  "#e2e8f0", // slate-200
  "#2dd4bf", // teal
  "#f97316", // orange
]

export function ExpenseDonutChart({
  categories,
  totalFormatted,
}: {
  categories: ExpenseCategoryData[]
  totalFormatted: string
}) {
  const cx = 96
  const cy = 96
  const r = 70
  const circumference = 2 * Math.PI * r

  // Build arc segments
  let accumulatedOffset = 0
  const segments = categories.map((cat, i) => {
    const dashLength = (cat.percentage / 100) * circumference
    const dashGap = circumference - dashLength
    const offset = -accumulatedOffset
    accumulatedOffset += dashLength
    return {
      ...cat,
      dashArray: `${dashLength} ${dashGap}`,
      dashOffset: offset,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }
  })

  return (
    <div>
      {/* Donut */}
      <div className="relative flex items-center justify-center">
        <svg className="w-48 h-48 transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={24}
          />
          {/* Segments */}
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={24}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          ))}
        </svg>
        {/* Center label */}
        <div className="absolute text-center">
          <p className="text-3xl font-bold text-slate-900">{totalFormatted}</p>
          <p className="text-xs text-slate-500 font-medium">Totalt brukt</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 space-y-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-sm font-medium text-slate-600">
                {seg.name}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-900">
              {seg.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
