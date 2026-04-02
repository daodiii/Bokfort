"use client"

const months = ["Mai", "Jun", "Jul", "Aug", "Sep", "Okt"]

export function RevenueExpensesChart() {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-lg font-bold">Inntekter vs. Utgifter</h3>
          <p className="text-slate-500 text-sm">Månedlig sammenligning</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-primary" />
            <span className="text-xs font-medium">Inntekter</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-primary/30" />
            <span className="text-xs font-medium">Utgifter</span>
          </div>
        </div>
      </div>
      <div className="relative h-64 w-full">
        <svg
          className="w-full h-full"
          viewBox="0 0 1000 200"
          preserveAspectRatio="none"
        >
          {/* Area Gradient */}
          <defs>
            <linearGradient
              id="gradient-revenue"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#11b661" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#11b661" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d="M0,150 Q100,140 200,100 T400,80 T600,120 T800,60 T1000,40 V200 H0 Z"
            fill="url(#gradient-revenue)"
          />
          {/* Revenue Line */}
          <path
            d="M0,150 Q100,140 200,100 T400,80 T600,120 T800,60 T1000,40"
            fill="none"
            stroke="#11b661"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Expense Line */}
          <path
            d="M0,180 Q100,170 200,150 T400,130 T600,160 T800,140 T1000,130"
            fill="none"
            stroke="#11b661"
            strokeWidth="2"
            strokeOpacity="0.4"
            strokeDasharray="8,4"
          />
        </svg>
        <div className="flex justify-between mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
          {months.map((month) => (
            <span
              key={month}
              className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
            >
              {month}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
