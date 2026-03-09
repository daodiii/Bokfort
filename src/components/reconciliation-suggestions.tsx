"use client"

import { useState, useEffect, useTransition } from "react"
import { getReconciliationSuggestions, type ReconcileResult } from "@/actions/ai"
import { matchTransaction } from "@/actions/bank-import"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Check, X, Loader2 } from "lucide-react"

type ReconciliationSuggestionsProps = {
  batchId: string
}

type Match = NonNullable<ReconcileResult["data"]>[number]

export function ReconciliationSuggestions({ batchId }: ReconciliationSuggestionsProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      const result = await getReconciliationSuggestions(batchId)
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setMatches(result.data)
      }
      setLoading(false)
    }
    load()
  }, [batchId])

  const handleAccept = (match: Match) => {
    startTransition(async () => {
      const result = await matchTransaction(match.transactionId, match.matchType, match.matchId)
      if (!result.error) {
        setAcceptedIds((prev) => new Set(prev).add(match.transactionId))
      }
    })
  }

  const handleDismiss = (transactionId: string) => {
    setDismissedIds((prev) => new Set(prev).add(transactionId))
  }

  const visibleMatches = matches.filter(
    (m) => !acceptedIds.has(m.transactionId) && !dismissedIds.has(m.transactionId)
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">AI analyserer transaksjoner...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || visibleMatches.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-blue-500" />
          AI-forslag ({visibleMatches.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleMatches.map((match) => (
          <div
            key={match.transactionId}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{match.reasoning}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {match.matchType === "expense" ? "Utgift" : "Inntekt"}
                </Badge>
                <Badge variant={match.confidence > 0.9 ? "default" : "secondary"}>
                  {Math.round(match.confidence * 100)}% sikker
                </Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" onClick={() => handleAccept(match)} disabled={isPending}>
                <Check className="size-3" />
                Godta
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDismiss(match.transactionId)}>
                <X className="size-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
