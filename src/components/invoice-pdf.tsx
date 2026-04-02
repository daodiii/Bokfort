import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"

// --- Types ---

type PdfTeam = {
  companyName: string | null
  name: string
  orgNumber: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  bankAccount: string | null
  logoUrl: string | null
  mvaRegistered: boolean
}

type PdfCustomer = {
  name: string
  orgNumber: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  email: string | null
}

type PdfLine = {
  description: string
  quantity: number
  unitPrice: number
  mvaRate: number
  lineTotal: number
  mvaAmount: number
}

type PdfInvoice = {
  invoiceNumber: number
  invoiceType: "INVOICE" | "CREDIT_NOTE"
  kidNumber: string | null
  issueDate: Date
  dueDate: Date
  subtotal: number
  mvaAmount: number
  total: number
  notes: string | null
  lines: PdfLine[]
  customer: PdfCustomer
}

export type InvoicePdfProps = {
  invoice: PdfInvoice
  team: PdfTeam
}

// --- Helpers ---

function formatNorwegianCurrency(ore: number): string {
  const kroner = ore / 100
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kroner)
}

function formatNorwegianDate(date: Date): string {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

function formatOrgNr(orgNr: string): string {
  const digits = orgNr.replace(/\s/g, "")
  if (digits.length !== 9) return orgNr
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
}

// --- Colors ---

const COLORS = {
  navy: "#0f2b3c",
  navyLight: "#1a3d52",
  accent: "#0f2b3c",
  creditRed: "#8b1a1a",
  creditRedLight: "#a02020",
  textPrimary: "#111827",
  textSecondary: "#4b5563",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  backgroundMuted: "#f9fafb",
  white: "#ffffff",
}

// --- Styles ---

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.textPrimary,
    paddingTop: 0,
    paddingBottom: 60,
    paddingHorizontal: 0,
  },
  // Top accent bar
  accentBar: {
    height: 6,
    width: "100%",
  },
  // Content area below the bar
  content: {
    paddingHorizontal: 44,
    paddingTop: 28,
  },
  // Header: logo/company left, title right
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 4,
  },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  companyOrgNr: {
    fontSize: 8,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
  },
  invoiceNumberBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 3,
  },
  invoiceNumberText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  // Parties row (From / To)
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  partyBlock: {
    width: "46%",
  },
  partyLabel: {
    fontSize: 7,
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  partyDetail: {
    fontSize: 9,
    color: COLORS.textSecondary,
    lineHeight: 1.6,
  },
  // Metadata strip
  metaStrip: {
    flexDirection: "row",
    backgroundColor: COLORS.backgroundMuted,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
  },
  // Line items table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.textPrimary,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: COLORS.backgroundMuted,
  },
  tableCell: {
    fontSize: 9,
    color: COLORS.textPrimary,
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
  },
  colDescription: { flex: 3.5 },
  colQuantity: { flex: 0.8, textAlign: "right" as const },
  colUnitPrice: { flex: 1.5, textAlign: "right" as const },
  colMvaRate: { flex: 0.8, textAlign: "right" as const },
  colTotal: { flex: 1.5, textAlign: "right" as const },
  // Totals section
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 24,
  },
  totalsBlock: {
    width: 240,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  totalsLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  totalsValue: {
    fontSize: 9,
    color: COLORS.textPrimary,
  },
  totalsDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.textPrimary,
    marginVertical: 4,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  totalLabelFinal: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  totalValueFinal: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  // Payment info box
  paymentSection: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap" as const,
  },
  paymentItem: {
    width: "50%",
    marginBottom: 6,
  },
  paymentKey: {
    fontSize: 7,
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  paymentValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
  },
  // Notes
  notesSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    lineHeight: 1.6,
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

// --- Component ---

export function InvoicePdf({ invoice, team }: InvoicePdfProps) {
  const isCreditNote = invoice.invoiceType === "CREDIT_NOTE"
  const accentColor = isCreditNote ? COLORS.creditRed : COLORS.navy
  const accentLight = isCreditNote ? COLORS.creditRedLight : COLORS.navyLight

  // Group MVA by rate
  const mvaByRate = new Map<number, number>()
  for (const line of invoice.lines) {
    const existing = mvaByRate.get(line.mvaRate) ?? 0
    mvaByRate.set(line.mvaRate, existing + line.mvaAmount)
  }

  const companyDisplay = team.companyName || team.name

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {team.logoUrl && (
                <Image src={team.logoUrl} style={styles.logo} />
              )}
              <View>
                <Text style={styles.companyName}>{companyDisplay}</Text>
                {team.orgNumber && (
                  <Text style={styles.companyOrgNr}>
                    Org.nr {formatOrgNr(team.orgNumber)}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={[styles.invoiceTitle, { color: accentColor }]}>
                {isCreditNote ? "KREDITNOTA" : "FAKTURA"}
              </Text>
              <View
                style={[
                  styles.invoiceNumberBadge,
                  { backgroundColor: accentLight },
                ]}
              >
                <Text style={styles.invoiceNumberText}>
                  #{invoice.invoiceNumber}
                </Text>
              </View>
            </View>
          </View>

          {/* Parties: From / To */}
          <View style={styles.partiesRow}>
            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>Fra</Text>
              <Text style={styles.partyName}>{companyDisplay}</Text>
              {team.address && (
                <Text style={styles.partyDetail}>{team.address}</Text>
              )}
              {(team.postalCode || team.city) && (
                <Text style={styles.partyDetail}>
                  {[team.postalCode, team.city].filter(Boolean).join(" ")}
                </Text>
              )}
              {team.orgNumber && (
                <Text style={styles.partyDetail}>
                  Org.nr: {formatOrgNr(team.orgNumber)}
                </Text>
              )}
            </View>
            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>Til</Text>
              <Text style={styles.partyName}>{invoice.customer.name}</Text>
              {invoice.customer.orgNumber && (
                <Text style={styles.partyDetail}>
                  Org.nr: {formatOrgNr(invoice.customer.orgNumber)}
                </Text>
              )}
              {invoice.customer.address && (
                <Text style={styles.partyDetail}>
                  {invoice.customer.address}
                </Text>
              )}
              {(invoice.customer.postalCode || invoice.customer.city) && (
                <Text style={styles.partyDetail}>
                  {[invoice.customer.postalCode, invoice.customer.city]
                    .filter(Boolean)
                    .join(" ")}
                </Text>
              )}
              {invoice.customer.email && (
                <Text style={styles.partyDetail}>
                  {invoice.customer.email}
                </Text>
              )}
            </View>
          </View>

          {/* Metadata strip */}
          <View style={styles.metaStrip}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>
                {isCreditNote ? "Kreditnota nr." : "Fakturanummer"}
              </Text>
              <Text style={styles.metaValue}>#{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Fakturadato</Text>
              <Text style={styles.metaValue}>
                {formatNorwegianDate(invoice.issueDate)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Forfallsdato</Text>
              <Text style={styles.metaValue}>
                {formatNorwegianDate(invoice.dueDate)}
              </Text>
            </View>
            {invoice.kidNumber && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>KID-nummer</Text>
                <Text style={styles.metaValue}>{invoice.kidNumber}</Text>
              </View>
            )}
          </View>

          {/* Line items table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>
                Beskrivelse
              </Text>
              <Text style={[styles.tableHeaderText, styles.colQuantity]}>
                Antall
              </Text>
              <Text style={[styles.tableHeaderText, styles.colUnitPrice]}>
                Enhetspris
              </Text>
              <Text style={[styles.tableHeaderText, styles.colMvaRate]}>
                MVA
              </Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>
                Sum
              </Text>
            </View>

            {invoice.lines.map((line, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={[styles.tableCell, styles.colDescription]}>
                  {line.description}
                </Text>
                <Text style={[styles.tableCell, styles.colQuantity]}>
                  {line.quantity}
                </Text>
                <Text style={[styles.tableCell, styles.colUnitPrice]}>
                  {formatNorwegianCurrency(line.unitPrice)} kr
                </Text>
                <Text style={[styles.tableCell, styles.colMvaRate]}>
                  {line.mvaRate}%
                </Text>
                <Text style={[styles.tableCellBold, styles.colTotal]}>
                  {formatNorwegianCurrency(line.lineTotal)} kr
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalsBlock}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Delbeloep</Text>
                <Text style={styles.totalsValue}>
                  {formatNorwegianCurrency(invoice.subtotal)} kr
                </Text>
              </View>
              {Array.from(mvaByRate.entries()).map(([rate, amount]) => (
                <View key={rate} style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>MVA {rate}%</Text>
                  <Text style={styles.totalsValue}>
                    {formatNorwegianCurrency(amount)} kr
                  </Text>
                </View>
              ))}
              <View style={styles.totalsDivider} />
              <View
                style={[
                  styles.totalRowFinal,
                  { backgroundColor: accentColor },
                ]}
              >
                <Text style={styles.totalLabelFinal}>Totalt</Text>
                <Text style={styles.totalValueFinal}>
                  {formatNorwegianCurrency(invoice.total)} kr
                </Text>
              </View>
            </View>
          </View>

          {/* Payment information */}
          {team.bankAccount && (
            <View style={styles.paymentSection}>
              <Text style={styles.paymentTitle}>Betalingsinformasjon</Text>
              <View style={styles.paymentGrid}>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentKey}>Kontonummer</Text>
                  <Text style={styles.paymentValue}>{team.bankAccount}</Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentKey}>Beloep</Text>
                  <Text style={styles.paymentValue}>
                    {formatNorwegianCurrency(invoice.total)} kr
                  </Text>
                </View>
                {invoice.kidNumber && (
                  <View style={styles.paymentItem}>
                    <Text style={styles.paymentKey}>KID-nummer</Text>
                    <Text style={styles.paymentValue}>
                      {invoice.kidNumber}
                    </Text>
                  </View>
                )}
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentKey}>Forfallsdato</Text>
                  <Text style={styles.paymentValue}>
                    {formatNorwegianDate(invoice.dueDate)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Notes */}
          {invoice.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notater</Text>
              <Text style={styles.notesText}>{invoice.notes}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{companyDisplay}</Text>
          <Text style={styles.footerText}>
            {team.orgNumber
              ? `Org.nr: ${formatOrgNr(team.orgNumber)}`
              : ""}
            {team.mvaRegistered ? " | MVA-registrert" : ""}
          </Text>
          <Text style={styles.footerText}>
            {team.bankAccount
              ? `Konto: ${team.bankAccount}`
              : ""}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
