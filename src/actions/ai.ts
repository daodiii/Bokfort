"use server"

import { getCurrentTeam } from "@/lib/auth-utils"
import { scanReceipt as scanReceiptAI, type OcrResult } from "@/lib/ai/ocr"

export type ScanReceiptResult = {
  data?: OcrResult
  error?: string
}

export async function scanReceiptAction(formData: FormData): Promise<ScanReceiptResult> {
  try {
    // Ensure user is authenticated
    await getCurrentTeam()

    const file = formData.get("receipt") as File | null
    if (!file || file.size === 0) {
      return { error: "Ingen fil valgt." }
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return { error: "Ugyldig filtype. Bruk JPEG, PNG, WebP eller PDF." }
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return { error: "Filen er for stor. Maks 10 MB." }
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    const result = await scanReceiptAI(base64, file.type)
    return { data: result }
  } catch {
    return { error: "Kunne ikke lese kvitteringen. Prøv igjen." }
  }
}
