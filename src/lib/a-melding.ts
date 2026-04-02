/**
 * A-melding XML generator.
 *
 * A-melding (Arbeidsgiver- og arbeidstakerregisteret) is the mandatory
 * monthly employer report to NAV, SSB, and Skatteetaten.
 *
 * Reports: employees, salary payments, tax deductions, pension contributions,
 * and employer's national insurance contributions (arbeidsgiveravgift).
 *
 * Submission: Monthly, by the 5th of the following month.
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
  return (ore / 100).toFixed(2)
}

function formatDate(date: Date): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export type AMeldingEmployee = {
  name: string
  personnummer: string | null
  startDate: Date
  endDate: Date | null
  position: string | null
}

export type AMeldingPayrollEntry = {
  employeeName: string
  personnummer: string | null
  grossAmount: number
  taxAmount: number
  pensionAmount: number
  netAmount: number
}

export type AMeldingData = {
  orgNumber: string
  companyName: string
  companyType: "ENK" | "AS"
  period: string // "YYYY-MM"
  employees: AMeldingEmployee[]
  payrollEntries: AMeldingPayrollEntry[]
  totalGross: number
  totalTax: number
  totalPension: number
  totalNet: number
  arbeidsgiveravgiftSone: string // Default "1" (14.1%)
  arbeidsgiveravgiftRate: number // 0.141
}

export function generateAMeldingXml(data: AMeldingData): string {
  const [yearStr, monthStr] = data.period.split("-")
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)

  // Period dates
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd = new Date(year, month, 0) // Last day of month

  const arbeidsgiveravgift = Math.round(data.totalGross * data.arbeidsgiveravgiftRate)

  const lines: string[] = []

  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<melding xmlns="urn:no:skatteetaten:datasamarbeid:amelding:v1">')

  // Header
  lines.push("  <leveranse>")
  lines.push(`    <kalendermaaned>${data.period}</kalendermaaned>`)
  lines.push(`    <leveranseTidspunkt>${new Date().toISOString()}</leveranseTidspunkt>`)
  lines.push("    <kildesystem>Bokfoert</kildesystem>")
  lines.push("    <meldingsId>AMelding-" + data.orgNumber.replace(/\s/g, "") + "-" + data.period + "</meldingsId>")
  lines.push("  </leveranse>")

  // Opplysningspliktig (employer)
  lines.push("  <opplysningspliktig>")
  lines.push(`    <norskIdentifikator>${escapeXml(data.orgNumber.replace(/\s/g, ""))}</norskIdentifikator>`)
  lines.push("  </opplysningspliktig>")

  // Virksomhet (business)
  lines.push("  <virksomhet>")
  lines.push(`    <norskIdentifikator>${escapeXml(data.orgNumber.replace(/\s/g, ""))}</norskIdentifikator>`)

  // Arbeidsgiveravgift
  lines.push("    <arbeidsgiveravgift>")
  lines.push(`      <beregningsKodeForArbeidsgiveravgift>generellNaeringVirksomhet</beregningsKodeForArbeidsgiveravgift>`)
  lines.push(`      <sone>${data.arbeidsgiveravgiftSone}</sone>`)
  lines.push("      <avgiftsgrunnlagOgSats>")
  lines.push(`        <avgiftsgrunnlag>${formatAmount(data.totalGross)}</avgiftsgrunnlag>`)
  lines.push(`        <sats>${(data.arbeidsgiveravgiftRate * 100).toFixed(1)}</sats>`)
  lines.push(`        <avgift>${formatAmount(arbeidsgiveravgift)}</avgift>`)
  lines.push("      </avgiftsgrunnlagOgSats>")
  lines.push("    </arbeidsgiveravgift>")

  // Inntektsmottaker (each employee with payroll)
  for (const entry of data.payrollEntries) {
    const emp = data.employees.find(
      (e) => e.name === entry.employeeName
    )

    lines.push("    <inntektsmottaker>")

    if (entry.personnummer) {
      lines.push(`      <norskIdentifikator>${escapeXml(entry.personnummer)}</norskIdentifikator>`)
    } else {
      lines.push(`      <internasjonalIdentifikator>UKJENT</internasjonalIdentifikator>`)
    }

    // Arbeidsforhold (employment relationship)
    lines.push("      <arbeidsforhold>")
    lines.push("        <typeArbeidsforhold>ordinaertArbeidsforhold</typeArbeidsforhold>")
    if (emp?.startDate) {
      lines.push(`        <startdato>${formatDate(emp.startDate)}</startdato>`)
    }
    if (emp?.endDate) {
      lines.push(`        <sluttdato>${formatDate(emp.endDate)}</sluttdato>`)
    }
    if (emp?.position) {
      lines.push(`        <yrke>0000</yrke>`) // STYRK code — simplified
    }
    lines.push(`        <antallTimerPerUkeSomEnFullStillingTilsvarer>37.5</antallTimerPerUkeSomEnFullStillingTilsvarer>`)
    lines.push(`        <stillingsprosent>100</stillingsprosent>`)
    lines.push("      </arbeidsforhold>")

    // Inntekt (income details)
    lines.push("      <inntekt>")
    lines.push(`        <startdatoOpptjeningsperiode>${formatDate(periodStart)}</startdatoOpptjeningsperiode>`)
    lines.push(`        <sluttdatoOpptjeningsperiode>${formatDate(periodEnd)}</sluttdatoOpptjeningsperiode>`)

    // Kontantytelse (cash payment — gross salary)
    lines.push("        <loennsinntekt>")
    lines.push("          <beskrivelse>fastloenn</beskrivelse>")
    lines.push(`          <beloep>${formatAmount(entry.grossAmount)}</beloep>`)
    lines.push("        </loennsinntekt>")
    lines.push("      </inntekt>")

    // Forskuddstrekk (tax deduction)
    lines.push("      <forskuddstrekk>")
    lines.push("        <beskrivelse>betaltTrygdeavgift</beskrivelse>")
    lines.push(`        <beloep>-${formatAmount(entry.taxAmount)}</beloep>`)
    lines.push("      </forskuddstrekk>")

    lines.push("    </inntektsmottaker>")
  }

  lines.push("  </virksomhet>")

  // Summary — total tax deductions
  lines.push("  <oppgave>")
  lines.push(`    <sumForskuddstrekk>${formatAmount(data.totalTax)}</sumForskuddstrekk>`)
  lines.push(`    <sumArbeidsgiveravgift>${formatAmount(arbeidsgiveravgift)}</sumArbeidsgiveravgift>`)
  lines.push("  </oppgave>")

  lines.push("</melding>")

  return lines.join("\n")
}
