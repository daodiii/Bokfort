import { openai } from "./client"

type CategoryOption = {
  id: string
  name: string
}

type CategorizationHistory = {
  description: string
  categoryName: string
}

export type CategorizationResult = {
  categoryId: string
  categoryName: string
  confidence: number
  reasoning: string
}

export type BulkCategorizationResult = {
  results: Array<{
    index: number
    categoryId: string
    categoryName: string
    confidence: number
    reasoning: string
  }>
}

export async function categorizeTransaction(
  description: string,
  amount: number,
  categories: CategoryOption[],
  history: CategorizationHistory[]
): Promise<CategorizationResult> {
  const historyContext = history.length > 0
    ? `\n\nTidligere kategoriseringer:\n${history.slice(0, 30).map((h) => `- "${h.description}" → ${h.categoryName}`).join("\n")}`
    : ""

  const categoryList = categories.map((c) => `${c.id}: ${c.name}`).join("\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: `Du er en norsk regnskapskategoriserer. Gitt en transaksjonsbeskrivelse og beløp, velg den mest passende kategorien.

Tilgjengelige kategorier:
${categoryList}

${historyContext}

Returner JSON med:
- "categoryId": ID-en til valgt kategori
- "categoryName": Navnet på valgt kategori
- "confidence": Konfidens fra 0 til 1
- "reasoning": Kort forklaring på norsk (maks 20 ord)`,
      },
      {
        role: "user",
        content: `Transaksjon: "${description}", beløp: ${amount} NOK`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("No response from categorization")
  return JSON.parse(content) as CategorizationResult
}

export async function categorizeBulk(
  transactions: Array<{ index: number; description: string; amount: number }>,
  categories: CategoryOption[],
  history: CategorizationHistory[]
): Promise<BulkCategorizationResult> {
  const historyContext = history.length > 0
    ? `\n\nTidligere kategoriseringer:\n${history.slice(0, 50).map((h) => `- "${h.description}" → ${h.categoryName}`).join("\n")}`
    : ""

  const categoryList = categories.map((c) => `${c.id}: ${c.name}`).join("\n")
  const txList = transactions
    .map((t) => `[${t.index}] "${t.description}" (${t.amount} NOK)`)
    .join("\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 1000,
    messages: [
      {
        role: "system",
        content: `Du er en norsk regnskapskategoriserer. Kategoriser alle transaksjonene nedenfor.

Tilgjengelige kategorier:
${categoryList}

${historyContext}

Returner JSON med:
- "results": Array med objekter for hver transaksjon:
  - "index": Transaksjonens indeks
  - "categoryId": ID-en til valgt kategori
  - "categoryName": Navnet på valgt kategori
  - "confidence": Konfidens fra 0 til 1
  - "reasoning": Kort forklaring på norsk (maks 10 ord)`,
      },
      {
        role: "user",
        content: `Transaksjoner:\n${txList}`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("No response from bulk categorization")
  return JSON.parse(content) as BulkCategorizationResult
}
