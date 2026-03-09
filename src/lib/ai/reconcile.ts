import { openai } from "./client"

type Transaction = {
  id: string
  date: string
  description: string
  amount: number
}

type MatchCandidate = {
  id: string
  description: string
  amount: number
  date: string
  type: "expense" | "income"
}

export type ReconciliationMatch = {
  transactionId: string
  matchType: "expense" | "income"
  matchId: string
  confidence: number
  reasoning: string
}

export type ReconciliationResult = {
  matches: ReconciliationMatch[]
}

export function preFilterCandidates(
  transaction: Transaction,
  candidates: MatchCandidate[]
): MatchCandidate[] {
  const txAmount = Math.abs(transaction.amount)
  const txDate = new Date(transaction.date).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  return candidates.filter((c) => {
    const cAmount = Math.abs(c.amount)
    const amountDiff = Math.abs(txAmount - cAmount) / Math.max(txAmount, 1)
    const dateDiff = Math.abs(new Date(c.date).getTime() - txDate)
    return amountDiff <= 0.02 && dateDiff <= sevenDays
  })
}

export async function reconcileTransactions(
  transactions: Array<Transaction & { candidates: MatchCandidate[] }>
): Promise<ReconciliationResult> {
  if (transactions.length === 0) return { matches: [] }

  const withCandidates = transactions.filter((t) => t.candidates.length > 0)
  if (withCandidates.length === 0) return { matches: [] }

  const txDescriptions = withCandidates
    .map((t) => {
      const candidateList = t.candidates
        .map(
          (c) =>
            `  - [${c.type}:${c.id}] "${c.description}" (${c.amount} øre, ${c.date})`
        )
        .join("\n")
      return `Transaksjon [${t.id}]: "${t.description}" (${t.amount} øre, ${t.date})\nKandidater:\n${candidateList}`
    })
    .join("\n\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: `Du er en norsk bankavstemmingsassistent. For hver banktransaksjon, velg den beste kandidaten fra listen, eller hopp over hvis ingen passer godt.

Vurder: beløpsmatch (viktigst), datoproksimitet, og beskrivelseslikhet.

Returner JSON:
{
  "matches": [
    {
      "transactionId": "tx-id",
      "matchType": "expense" eller "income",
      "matchId": "candidate-id",
      "confidence": 0-1,
      "reasoning": "Kort forklaring på norsk"
    }
  ]
}

Kun inkluder matches med confidence > 0.7. Hver kandidat kan bare matches til én transaksjon.`,
      },
      {
        role: "user",
        content: txDescriptions,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("No response from reconciliation")
  const result = JSON.parse(content) as ReconciliationResult
  result.matches = result.matches.filter((m) => m.confidence > 0.7)
  return result
}
