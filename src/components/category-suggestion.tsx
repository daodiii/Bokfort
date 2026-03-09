"use client"

import { useState, useEffect, useRef } from "react"
import { categorizeTransactionAction } from "@/actions/ai"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CategorySuggestionProps = {
  description: string
  amount: number
  onAccept: (categoryId: string) => void
}

export function CategorySuggestion({ description, amount, onAccept }: CategorySuggestionProps) {
  const [suggestion, setSuggestion] = useState<{
    categoryId: string
    categoryName: string
    confidence: number
    reasoning: string
  } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (description.length < 3 || amount <= 0) {
      setSuggestion(null)
      return
    }

    setDismissed(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const result = await categorizeTransactionAction(description, amount)
      setLoading(false)

      if (result.data && result.data.confidence > 0.5) {
        setSuggestion(result.data)
      } else {
        setSuggestion(null)
      }
    }, 1000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [description, amount])

  if (dismissed || (!loading && !suggestion)) return null

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
      "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
    )}>
      <Sparkles className="size-4 text-blue-500 shrink-0" />
      {loading ? (
        <span className="text-muted-foreground">Foreslår kategori...</span>
      ) : suggestion ? (
        <>
          <span className="text-muted-foreground">Forslag:</span>
          <span className="font-medium">{suggestion.categoryName}</span>
          <span className="text-muted-foreground text-xs">({suggestion.reasoning})</span>
          <div className="ml-auto flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onAccept(suggestion.categoryId)}
            >
              Bruk
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setDismissed(true)}
            >
              <X className="size-3" />
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
