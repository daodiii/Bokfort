import { openai } from "./client"

type PastInvoiceLine = {
  description: string
  quantity: number
  unitPrice: number
  mvaRate: number
}

type PastInvoice = {
  invoiceNumber: number
  issueDate: string
  lines: PastInvoiceLine[]
  notes: string | null
}

export type SuggestedLine = {
  description: string
  quantity: number
  unitPrice: number
  mvaRate: 0 | 12 | 15 | 25
}

export type InvoiceSuggestion = {
  lines: SuggestedLine[]
  notes: string
}

export async function suggestInvoiceLines(
  customerName: string,
  pastInvoices: PastInvoice[],
  briefDescription?: string
): Promise<InvoiceSuggestion> {
  const historyContext = pastInvoices.length > 0
    ? `\n\nTidligere fakturaer til denne kunden:\n${pastInvoices.map((inv) => {
        const lines = inv.lines.map((l) => `  - ${l.description} (${l.quantity}x, ${(l.unitPrice / 100).toFixed(0)} kr, MVA ${l.mvaRate}%)`).join("\n")
        return `Faktura #${inv.invoiceNumber} (${inv.issueDate}):\n${lines}${inv.notes ? `\n  Notater: ${inv.notes}` : ""}`
      }).join("\n\n")}`
    : ""

  const userPrompt = briefDescription
    ? `Kunden "${customerName}" trenger en faktura for: ${briefDescription}`
    : `Kunden "${customerName}" trenger en ny faktura. Foreslå linjer basert på historikk.`

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content: `Du er en norsk fakturagenerator. Foreslå profesjonelle fakturalinjer.
${historyContext}

Regler:
- Beskrivelser skal være profesjonelle og på norsk
- unitPrice er i øre (1 kr = 100 øre)
- Velg riktig MVA-sats (0, 12, 15 eller 25). Standard er 25%.
- Hvis det finnes historikk, bruk lignende priser og beskrivelser
- Hvis det er en kort beskrivelse, utvid til profesjonelle fakturalinjer

Returner JSON:
{
  "lines": [
    {
      "description": "Profesjonell beskrivelse",
      "quantity": 1,
      "unitPrice": 150000,
      "mvaRate": 25
    }
  ],
  "notes": "Valgfrie fakturanotater"
}`,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("No response from invoice generation")

  const result = JSON.parse(content) as InvoiceSuggestion

  for (const line of result.lines) {
    if (![0, 12, 15, 25].includes(line.mvaRate)) {
      line.mvaRate = 25
    }
  }

  return result
}
