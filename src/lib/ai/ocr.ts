import { openai } from "./client"

export type OcrResult = {
  description: string
  amount: number
  date: string
  mvaRate: 0 | 12 | 15 | 25
  suggestedCategory: string
  confidence: number
}

export async function scanReceipt(base64Image: string, mimeType: string): Promise<OcrResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content: `Du er en norsk kvitteringsleser. Analyser bildet og ekstraher følgende felter som JSON:
- "description": Butikknavn og hva som ble kjøpt (kort beskrivelse på norsk)
- "amount": Totalbeløp i NOK (kroner, ikke øre). Bruk negativt tall hvis det er en kreditnota.
- "date": Dato i format YYYY-MM-DD
- "mvaRate": MVA-sats som ble brukt (0, 12, 15, eller 25). Standard er 25 hvis ukjent.
- "suggestedCategory": Foreslått utgiftskategori på norsk (f.eks. "Kontorrekvisita", "Reise", "Mat og drikke", "Programvare", "Telefon og internett")
- "confidence": Konfidens fra 0 til 1 for kvaliteten på ekstraksjonen

Returner kun gyldig JSON. Hvis bildet ikke er en kvittering, returner confidence: 0.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("No response from OCR")
  }

  const parsed = JSON.parse(content) as OcrResult

  // Validate mvaRate
  if (![0, 12, 15, 25].includes(parsed.mvaRate)) {
    parsed.mvaRate = 25
  }

  return parsed
}
