import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

type PayslipTeam = {
  companyName: string | null
  name: string
  orgNumber: string | null
  address: string | null
  city: string | null
  postalCode: string | null
}

type PayslipEmployee = {
  name: string
  position: string | null
  bankAccount: string | null
}

type PayslipEntry = {
  grossAmount: number
  taxAmount: number
  pensionAmount: number
  netAmount: number
}

type PayslipProps = {
  team: PayslipTeam
  employee: PayslipEmployee
  entry: PayslipEntry
  period: string
  taxPercent: number
  pensionPercent: number
}

function formatNorwegianCurrency(ore: number): string {
  const kroner = ore / 100
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kroner)
}

function formatOrgNr(orgNr: string): string {
  const digits = orgNr.replace(/\s/g, "")
  if (digits.length !== 9) return orgNr
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-")
  const months = [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Desember",
  ]
  const monthName = months[parseInt(month, 10) - 1] ?? month
  return `${monthName} ${year}`
}

const COLORS = {
  navy: "#0f2b3c",
  textPrimary: "#111827",
  textSecondary: "#4b5563",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  backgroundMuted: "#f9fafb",
  white: "#ffffff",
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.textPrimary,
    paddingTop: 0,
    paddingBottom: 60,
    paddingHorizontal: 0,
  },
  accentBar: {
    height: 6,
    backgroundColor: COLORS.navy,
    width: "100%",
  },
  content: {
    paddingHorizontal: 44,
    paddingTop: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 8,
    color: COLORS.textMuted,
    lineHeight: 1.6,
  },
  title: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
    letterSpacing: 2,
  },
  periodBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: COLORS.navy,
    borderRadius: 3,
  },
  periodText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  // Employee info
  employeeSection: {
    backgroundColor: COLORS.backgroundMuted,
    borderRadius: 4,
    padding: 14,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  employeeName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  employeeDetail: {
    fontSize: 9,
    color: COLORS.textSecondary,
    lineHeight: 1.6,
  },
  // Pay breakdown table
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.textPrimary,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  colDescription: { flex: 3 },
  colPercent: { flex: 1, textAlign: "right" as const },
  colAmount: { flex: 1.5, textAlign: "right" as const },
  cellText: {
    fontSize: 9,
    color: COLORS.textPrimary,
  },
  cellBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
  },
  // Net pay
  netPayContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 24,
  },
  netPayBlock: {
    width: 260,
  },
  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.textPrimary,
    marginVertical: 4,
  },
  netPayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.navy,
    borderRadius: 3,
  },
  netPayLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  netPayValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  // Payment info
  paymentInfo: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  paymentKey: {
    width: 140,
    fontSize: 7,
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  paymentValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.textMuted,
  },
})

export function PayslipPdf({
  team,
  employee,
  entry,
  period,
  taxPercent,
  pensionPercent,
}: PayslipProps) {
  const companyDisplay = team.companyName || team.name

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.companyName}>{companyDisplay}</Text>
              {team.orgNumber && (
                <Text style={styles.companyDetail}>
                  Org.nr {formatOrgNr(team.orgNumber)}
                </Text>
              )}
              {team.address && (
                <Text style={styles.companyDetail}>{team.address}</Text>
              )}
              {(team.postalCode || team.city) && (
                <Text style={styles.companyDetail}>
                  {[team.postalCode, team.city].filter(Boolean).join(" ")}
                </Text>
              )}
            </View>
            <View style={{ alignItems: "flex-end" as const }}>
              <Text style={styles.title}>LOENNSSLIPP</Text>
              <View style={styles.periodBadge}>
                <Text style={styles.periodText}>{formatPeriod(period)}</Text>
              </View>
            </View>
          </View>

          {/* Employee info */}
          <View style={styles.employeeSection}>
            <Text style={styles.sectionLabel}>Ansatt</Text>
            <Text style={styles.employeeName}>{employee.name}</Text>
            {employee.position && (
              <Text style={styles.employeeDetail}>
                Stilling: {employee.position}
              </Text>
            )}
          </View>

          {/* Pay breakdown */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>
                Beskrivelse
              </Text>
              <Text style={[styles.tableHeaderText, styles.colPercent]}>
                Sats
              </Text>
              <Text style={[styles.tableHeaderText, styles.colAmount]}>
                Beloep
              </Text>
            </View>

            {/* Gross salary */}
            <View style={styles.tableRow}>
              <Text style={[styles.cellBold, styles.colDescription]}>
                Bruttoloen
              </Text>
              <Text style={[styles.cellText, styles.colPercent]} />
              <Text style={[styles.cellBold, styles.colAmount]}>
                {formatNorwegianCurrency(entry.grossAmount)} kr
              </Text>
            </View>

            {/* Tax deduction */}
            <View style={styles.tableRow}>
              <Text style={[styles.cellText, styles.colDescription]}>
                Skattetrekk
              </Text>
              <Text style={[styles.cellText, styles.colPercent]}>
                {taxPercent}%
              </Text>
              <Text style={[styles.cellText, styles.colAmount]}>
                -{formatNorwegianCurrency(entry.taxAmount)} kr
              </Text>
            </View>

            {/* Pension (informational) */}
            <View style={styles.tableRow}>
              <Text style={[styles.cellText, styles.colDescription]}>
                Pensjonsinnskudd (arbeidsgiver)
              </Text>
              <Text style={[styles.cellText, styles.colPercent]}>
                {pensionPercent}%
              </Text>
              <Text style={[styles.cellText, styles.colAmount]}>
                {formatNorwegianCurrency(entry.pensionAmount)} kr
              </Text>
            </View>
          </View>

          {/* Net pay */}
          <View style={styles.netPayContainer}>
            <View style={styles.netPayBlock}>
              <View style={styles.divider} />
              <View style={styles.netPayRow}>
                <Text style={styles.netPayLabel}>Utbetalt</Text>
                <Text style={styles.netPayValue}>
                  {formatNorwegianCurrency(entry.netAmount)} kr
                </Text>
              </View>
            </View>
          </View>

          {/* Payment info */}
          {employee.bankAccount && (
            <View style={styles.paymentInfo}>
              <Text style={styles.sectionLabel}>Utbetalingsinformasjon</Text>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>Kontonummer</Text>
                <Text style={styles.paymentValue}>{employee.bankAccount}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>Periode</Text>
                <Text style={styles.paymentValue}>{formatPeriod(period)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>Nettoloen</Text>
                <Text style={styles.paymentValue}>
                  {formatNorwegianCurrency(entry.netAmount)} kr
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{companyDisplay}</Text>
          <Text style={styles.footerText}>
            Loennsslipp {formatPeriod(period)}
          </Text>
          <Text style={styles.footerText}>
            {team.orgNumber
              ? `Org.nr: ${formatOrgNr(team.orgNumber)}`
              : ""}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
