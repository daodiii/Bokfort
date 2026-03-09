import { openai } from "./client"

export type Anomaly = {
  type: "duplicate" | "unusual_amount" | "round_number" | "missing_receipt" | "date_gap"
  severity: "low" | "medium" | "high"
  description: string
  transactionIds: string[]
  suggestedAction: string
}

export type AnomalyResult = {
  anomalies: Anomaly[]
}

type ExpenseRecord = {
  id: string
  description: string
  amount: number
  date: string
  mvaRate: number
  receiptUrl: string | null
  categoryName: string | null
}

export function prescanAnomalies(expenses: ExpenseRecord[]): {
  flagged: Anomaly[]
  candidatesForAi: ExpenseRecord[]
} {
  const flagged: Anomaly[] = []
  const candidatesForAi: ExpenseRecord[] = []

  // Check for duplicate payments (same amount + similar description within 7 days)
  for (let i = 0; i < expenses.length; i++) {
    for (let j = i + 1; j < expenses.length; j++) {
      const a = expenses[i]
      const b = expenses[j]
      if (
        a.amount === b.amount &&
        Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) <= 7 * 24 * 60 * 60 * 1000
      ) {
        flagged.push({
          type: "duplicate",
          severity: a.amount > 500000 ? "high" : "medium",
          description: `Mulig dobbeltbetaling: "${a.description}" og "${b.description}" har samme beløp innen 7 dager`,
          transactionIds: [a.id, b.id],
          suggestedAction: "Sjekk om dette er en duplisert betaling og slett den ene om nødvendig.",
        })
      }
    }
  }

  // Check for missing receipts on high-value expenses (> 1000 NOK = 100000 øre)
  for (const exp of expenses) {
    if (!exp.receiptUrl && exp.amount > 100000) {
      flagged.push({
        type: "missing_receipt",
        severity: "low",
        description: `Utgiften "${exp.description}" på ${(exp.amount / 100).toFixed(0)} kr mangler kvittering`,
        transactionIds: [exp.id],
        suggestedAction: "Last opp kvittering for denne utgiften.",
      })
    }
  }

  // Collect candidates for AI analysis
  const categoryAmounts = new Map<string, number[]>()
  for (const exp of expenses) {
    const cat = exp.categoryName ?? "Ukategorisert"
    if (!categoryAmounts.has(cat)) categoryAmounts.set(cat, [])
    categoryAmounts.get(cat)!.push(exp.amount)
  }

  for (const exp of expenses) {
    const cat = exp.categoryName ?? "Ukategorisert"
    const amounts = categoryAmounts.get(cat) ?? []
    if (amounts.length >= 3) {
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
      if (exp.amount > avg * 3) {
        candidatesForAi.push(exp)
      }
    }
    // Round number check (exactly divisible by 100 NOK / 10000 øre, and over 5000 NOK)
    if (exp.amount >= 500000 && exp.amount % 10000 === 0) {
      candidatesForAi.push(exp)
    }
  }

  return { flagged, candidatesForAi }
}

export async function analyzeAnomalies(
  candidates: ExpenseRecord[],
  categoryAverages: Map<string, number>
): Promise<Anomaly[]> {
  if (candidates.length === 0) return []

  const avgContext = [...categoryAverages.entries()]
    .map(([cat, avg]) => `${cat}: gjennomsnitt ${(avg / 100).toFixed(0)} kr`)
    .join("\n")

  const expContext = candidates
    .map((e) => `[${e.id}] "${e.description}" - ${(e.amount / 100).toFixed(0)} kr (${e.categoryName ?? "Ukategorisert"}, ${e.date})`)
    .join("\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: `Du er en norsk regnskapsrevisor. Analyser disse utgiftene for uregelmessigheter.

Gjennomsnitt per kategori:
${avgContext}

Returner JSON:
{
  "anomalies": [
    {
      "type": "unusual_amount" | "round_number",
      "severity": "low" | "medium" | "high",
      "description": "Kort beskrivelse på norsk",
      "transactionIds": ["id1"],
      "suggestedAction": "Hva brukeren bør gjøre"
    }
  ]
}

Kun rapporter reelle uregelmessigheter. Ikke flagg normale utgifter.`,
      },
      {
        role: "user",
        content: `Utgifter å analysere:\n${expContext}`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) return []

  const result = JSON.parse(content) as AnomalyResult
  return result.anomalies ?? []
}
