/**
 * MVA-melding (VAT return) XML generator.
 *
 * Generates the Skatteetaten-compatible XML for MVA-melding submission.
 * Based on the modernized MVA-melding format (from 2022+).
 *
 * The MVA-melding maps to specific "MVA-koder" (tax codes):
 * - Kode 1: Innenlandsk omsetning med fradrag (25%)
 * - Kode 11: Innenlandsk omsetning med fradrag (15% — food/drink)
 * - Kode 13: Innenlandsk omsetning med fradrag (12% — transport/hotel)
 * - Kode 3: Utgående avgift (0% — avgiftsfri)
 * - Kode 5: Innenlandsk omsetning utenfor avgiftsområdet
 * - Kode 14: Fradragsberettiget inngående avgift (25%)
 * - Kode 15: Fradragsberettiget inngående avgift (15%)
 * - Kode 81: Fradragsberettiget inngående avgift (12%)
 */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function formatAmount(ore: number): string {
  const kroner = ore / 100
  return kroner.toFixed(2)
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Map MVA rates to Skatteetaten MVA-koder for outgoing (utgående)
const OUTGOING_MVA_KODE: Record<number, string> = {
  25: "1",    // Alminnelig sats
  15: "11",   // Redusert sats (mat/drikke)
  12: "13",   // Lav sats (transport/hotell/kino)
  0: "3",     // Avgiftsfri omsetning
}

// Map MVA rates to Skatteetaten MVA-koder for incoming (inngående/fradrag)
const INCOMING_MVA_KODE: Record<number, string> = {
  25: "14",   // Fradrag alminnelig sats
  15: "15",   // Fradrag redusert sats
  12: "81",   // Fradrag lav sats
}

export type MvaMeldingData = {
  orgNumber: string
  companyName: string
  periodStart: Date
  periodEnd: Date
  meldingsKategori: "alminnelig" | "primaer"
  outgoing: { rate: number; base: number; mva: number }[]
  incoming: { rate: number; base: number; mva: number }[]
  totalOutgoing: number
  totalIncoming: number
  netMva: number
}

export function generateMvaMeldingXml(data: MvaMeldingData): string {
  const lines: string[] = []

  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<mvaMeldingDto xmlns="no:skatteetaten:fastsetting:avgift:mva:skattemeldingformerverdiavgift:v1.0">')

  // Innsending
  lines.push("  <innsending>")
  lines.push(`    <regnskapssystemReferanse>Bokfoert</regnskapssystemReferanse>`)
  lines.push(`    <regnskapssystem>`)
  lines.push(`      <systemnavn>Bokfoert</systemnavn>`)
  lines.push(`      <systemversjon>1.0</systemversjon>`)
  lines.push(`    </regnskapssystem>`)
  lines.push("  </innsending>")

  // Skattepliktig
  lines.push("  <skattepliktig>")
  lines.push(`    <organisasjonsnummer>${escapeXml(data.orgNumber.replace(/\s/g, ""))}</organisasjonsnummer>`)
  lines.push("  </skattepliktig>")

  // Meldingskategori
  lines.push(`  <meldingskategori>${data.meldingsKategori}</meldingskategori>`)

  // Skattleggingsperiode
  lines.push("  <skattleggingsperiode>")
  lines.push(`    <periode>${formatTerminPeriod(data.periodStart)}</periode>`)
  lines.push(`    <aar>${data.periodStart.getFullYear()}</aar>`)
  lines.push("    <skattleggingsperiodeType>to-maanedlig</skattleggingsperiodeType>")
  lines.push("  </skattleggingsperiode>")

  // MVA-spesifikasjonslinje — outgoing (utgående avgift)
  for (const item of data.outgoing) {
    const kode = OUTGOING_MVA_KODE[item.rate]
    if (!kode || item.mva === 0) continue

    lines.push("  <mvaSpesifikasjonslinje>")
    lines.push(`    <mvaKode>${kode}</mvaKode>`)
    lines.push(`    <mvaKodeRegnskapsystem>${item.rate}%</mvaKodeRegnskapsystem>`)
    lines.push(`    <grunnlag>${formatAmount(item.base)}</grunnlag>`)
    lines.push(`    <sats>${item.rate}</sats>`)
    lines.push(`    <merverdiavgift>${formatAmount(item.mva)}</merverdiavgift>`)
    lines.push("  </mvaSpesifikasjonslinje>")
  }

  // MVA-spesifikasjonslinje — incoming (inngående avgift / fradrag)
  for (const item of data.incoming) {
    const kode = INCOMING_MVA_KODE[item.rate]
    if (!kode || item.mva === 0) continue

    lines.push("  <mvaSpesifikasjonslinje>")
    lines.push(`    <mvaKode>${kode}</mvaKode>`)
    lines.push(`    <mvaKodeRegnskapsystem>${item.rate}%</mvaKodeRegnskapsystem>`)
    lines.push(`    <grunnlag>${formatAmount(item.base)}</grunnlag>`)
    lines.push(`    <sats>${item.rate}</sats>`)
    // Incoming MVA is negative (fradrag)
    lines.push(`    <merverdiavgift>-${formatAmount(item.mva)}</merverdiavgift>`)
    lines.push("  </mvaSpesifikasjonslinje>")
  }

  // Beregnet avgift (net)
  lines.push("  <beregnetSkatt>")
  lines.push(`    <fastsattMerverdiavgift>${formatAmount(data.netMva)}</fastsattMerverdiavgift>`)
  lines.push("  </beregnetSkatt>")

  lines.push("</mvaMeldingDto>")

  return lines.join("\n")
}

/**
 * Compute the 2-month termin period from a date.
 * Norwegian MVA uses 6 termins per year (jan-feb, mar-apr, etc.)
 */
function formatTerminPeriod(date: Date): string {
  const month = date.getMonth() + 1 // 1-indexed
  const termin = Math.ceil(month / 2) // 1-6
  return `januar-februar,mars-april,mai-juni,juli-august,september-oktober,november-desember`.split(",")[termin - 1]
}
