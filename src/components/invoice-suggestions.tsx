"use client"

import { useState, useEffect } from "react"
import { getInvoiceSuggestions } from "@/actions/ai"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Sparkles, Check, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type SuggestedLine = {
  description: string
  quantity: number
  unitPrice: number
  mvaRate: 0 | 12 | 15 | 25
}

type InvoiceSuggestionsProps = {
  customerId: string
  onAccept: (lines: SuggestedLine[], notes: string) => void
}

export function InvoiceSuggestions({ customerId, onAccept }: InvoiceSuggestionsProps) {
  const [suggestion, setSuggestion] = useState<{ lines: SuggestedLine[]; notes: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!customerId) {
      setSuggestion(null)
      return
    }

    setDismissed(false)
    setLoading(true)

    getInvoiceSuggestions(customerId).then((result) => {
      if (result.data && result.data.lines.length > 0) {
        setSuggestion(result.data)
      } else {
        setSuggestion(null)
      }
      setLoading(false)
    })
  }, [customerId])

  if (dismissed || (!loading && !suggestion)) return null

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-blue-500" />
          <span className="text-sm font-medium">AI-forslag basert på tidligere fakturaer</span>
        </div>
        <div className="flex gap-1">
          {suggestion && (
            <Button
              type="button"
              size="sm"
              onClick={() => onAccept(suggestion.lines, suggestion.notes)}
            >
              <Check className="size-3" />
              Bruk forslag
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Genererer forslag...</span>
        </div>
      ) : suggestion ? (
        <div className="space-y-2">
          {suggestion.lines.map((line, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>
                {line.description} ({line.quantity}x)
              </span>
              <span className="font-medium">
                {formatCurrency(line.unitPrice * line.quantity)} + {line.mvaRate}% MVA
              </span>
            </div>
          ))}
          {suggestion.notes && (
            <p className="text-xs text-muted-foreground mt-2">Notater: {suggestion.notes}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
