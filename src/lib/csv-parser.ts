export type ParsedTransaction = {
  date: Date
  description: string
  amount: number
  balance: number | null
}

export function parseBankCsv(csvContent: string): ParsedTransaction[] {
  const lines = csvContent.trim().split("\n")
  if (lines.length < 2) return []

  const separator = lines[0].includes(";") ? ";" : ","
  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase().replace(/"/g, ""))

  const transactions: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(separator).map((c) => c.trim().replace(/"/g, ""))
    if (cols.length < 2) continue

    const tx = parseRow(headers, cols)
    if (tx) transactions.push(tx)
  }

  return transactions
}

function parseRow(headers: string[], cols: string[]): ParsedTransaction | null {
  try {
    const dateIdx = headers.findIndex((h) =>
      h.includes("dato") || h.includes("date") || h === "bokført"
    )
    const descIdx = headers.findIndex((h) =>
      h.includes("tekst") || h.includes("forklaring") || h.includes("beskrivelse") || h.includes("description")
    )
    const amountIdx = headers.findIndex((h) =>
      h.includes("beløp") || h.includes("amount")
    )
    const inIdx = headers.findIndex((h) =>
      h.includes("inn") || h.includes("innbetaling") || h.includes("innskudd")
    )
    const outIdx = headers.findIndex((h) =>
      h.includes("ut") || h.includes("utbetaling") || h.includes("uttak")
    )
    const balanceIdx = headers.findIndex((h) =>
      h.includes("saldo") || h.includes("balance")
    )

    if (dateIdx === -1 || descIdx === -1) return null

    const date = parseNorwegianDate(cols[dateIdx])
    if (!date) return null

    const description = cols[descIdx]

    let amountOre: number
    if (amountIdx !== -1) {
      amountOre = parseNorwegianNumber(cols[amountIdx])
    } else if (inIdx !== -1 && outIdx !== -1) {
      const inAmount = cols[inIdx] ? parseNorwegianNumber(cols[inIdx]) : 0
      const outAmount = cols[outIdx] ? parseNorwegianNumber(cols[outIdx]) : 0
      amountOre = inAmount > 0 ? inAmount : -outAmount
    } else {
      return null
    }

    const balance = balanceIdx !== -1 && cols[balanceIdx]
      ? parseNorwegianNumber(cols[balanceIdx])
      : null

    return { date, description, amount: amountOre, balance }
  } catch {
    return null
  }
}

function parseNorwegianNumber(str: string): number {
  const cleaned = str.replace(/\s/g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

function parseNorwegianDate(str: string): Date | null {
  const dotMatch = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dotMatch) {
    return new Date(+dotMatch[3], +dotMatch[2] - 1, +dotMatch[1])
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3])
  }
  return null
}
