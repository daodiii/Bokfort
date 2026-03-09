"use client"

import { useState, useEffect } from "react"
import { getAnomaliesAction } from "@/actions/ai"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

type Anomaly = {
  type: string
  severity: "low" | "medium" | "high"
  description: string
  transactionIds: string[]
  suggestedAction: string
}

const severityStyles = {
  low: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30",
  medium: "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30",
  high: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
}

const severityIconStyles = {
  low: "text-yellow-500",
  medium: "text-orange-500",
  high: "text-red-500",
}

export function AnomalyAlerts() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const stored = localStorage.getItem("bokfort-dismissed-anomalies")
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    async function load() {
      const result = await getAnomaliesAction()
      if (result.data) {
        setAnomalies(result.data)
      }
      setLoading(false)
    }
    load()
  }, [])

  const dismiss = (index: number) => {
    const key = `${anomalies[index].type}-${anomalies[index].transactionIds.join(",")}`
    const newDismissed = new Set(dismissedIds).add(key)
    setDismissedIds(newDismissed)
    try {
      localStorage.setItem(
        "bokfort-dismissed-anomalies",
        JSON.stringify([...newDismissed])
      )
    } catch { /* ignore */ }
  }

  const visibleAnomalies = anomalies.filter((a) => {
    const key = `${a.type}-${a.transactionIds.join(",")}`
    return !dismissedIds.has(key)
  })

  if (loading) return null
  if (visibleAnomalies.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground">
          Uregelmessigheter ({visibleAnomalies.length})
        </h2>
      </div>
      {visibleAnomalies.map((anomaly, index) => (
        <Card key={index} className={cn("border", severityStyles[anomaly.severity])}>
          <CardContent className="flex items-start gap-3 py-3">
            <AlertTriangle className={cn("size-5 shrink-0 mt-0.5", severityIconStyles[anomaly.severity])} />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{anomaly.description}</p>
              <p className="text-xs text-muted-foreground">{anomaly.suggestedAction}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => dismiss(index)}
              className="shrink-0"
            >
              <X className="size-3" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
