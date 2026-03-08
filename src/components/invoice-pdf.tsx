import {
  Document,
  Page,
  Text,
  View,
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

// --- Styles ---

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 40,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    textAlign: "right" as const,
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 11,
    textAlign: "right" as const,
    color: "#666",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  infoBlock: {
    width: "48%",
  },
  infoLabel: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  infoBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 2,
  },
  datesRow: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 40,
  },
  dateBlock: {},
  dateLabel: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  // Table
  table: {
    marginBottom: 24,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  colDescription: {
    flex: 3,
  },
  colQuantity: {
    flex: 1,
    textAlign: "right" as const,
  },
  colUnitPrice: {
    flex: 1.5,
    textAlign: "right" as const,
  },
  colMvaRate: {
    flex: 1,
    textAlign: "right" as const,
  },
  colTotal: {
    flex: 1.5,
    textAlign: "right" as const,
  },
  tableHeaderText: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  // Totals
  totalsContainer: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  totalsBlock: {
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsLabel: {
    color: "#666",
  },
  totalsValue: {},
  totalsDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  totalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  // Notes
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#eee",
  },
  notesLabel: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  // Payment info
  paymentSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
  },
  paymentLabel: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  paymentKey: {
    width: 100,
    color: "#666",
    fontSize: 9,
  },
  paymentValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center" as const,
    fontSize: 7,
    color: "#aaa",
  },
})

// --- Component ---

export function InvoicePdf({ invoice, team }: InvoicePdfProps) {
  // Group MVA by rate
  const mvaByRate = new Map<number, number>()
  for (const line of invoice.lines) {
    const existing = mvaByRate.get(line.mvaRate) ?? 0
    mvaByRate.set(line.mvaRate, existing + line.mvaAmount)
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>
              {team.companyName || team.name}
            </Text>
            {team.orgNumber && (
              <Text style={styles.infoText}>
                Org.nr: {formatOrgNr(team.orgNumber)}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FAKTURA</Text>
            <Text style={styles.invoiceNumber}>
              #{invoice.invoiceNumber}
            </Text>
          </View>
        </View>

        {/* From / To */}
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Fra</Text>
            <Text style={styles.infoBold}>
              {team.companyName || team.name}
            </Text>
            {team.address && (
              <Text style={styles.infoText}>{team.address}</Text>
            )}
            {(team.postalCode || team.city) && (
              <Text style={styles.infoText}>
                {[team.postalCode, team.city].filter(Boolean).join(" ")}
              </Text>
            )}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Til</Text>
            <Text style={styles.infoBold}>{invoice.customer.name}</Text>
            {invoice.customer.orgNumber && (
              <Text style={styles.infoText}>
                Org.nr: {formatOrgNr(invoice.customer.orgNumber)}
              </Text>
            )}
            {invoice.customer.address && (
              <Text style={styles.infoText}>
                {invoice.customer.address}
              </Text>
            )}
            {(invoice.customer.postalCode || invoice.customer.city) && (
              <Text style={styles.infoText}>
                {[invoice.customer.postalCode, invoice.customer.city]
                  .filter(Boolean)
                  .join(" ")}
              </Text>
            )}
            {invoice.customer.email && (
              <Text style={styles.infoText}>{invoice.customer.email}</Text>
            )}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesRow}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Fakturanummer</Text>
            <Text style={styles.dateValue}>#{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Fakturadato</Text>
            <Text style={styles.dateValue}>
              {formatNorwegianDate(invoice.issueDate)}
            </Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Forfallsdato</Text>
            <Text style={styles.dateValue}>
              {formatNorwegianDate(invoice.dueDate)}
            </Text>
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeaderRow}>
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
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Sum</Text>
          </View>

          {/* Table body */}
          {invoice.lines.map((line, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDescription}>{line.description}</Text>
              <Text style={styles.colQuantity}>{line.quantity}</Text>
              <Text style={styles.colUnitPrice}>
                {formatNorwegianCurrency(line.unitPrice)} kr
              </Text>
              <Text style={styles.colMvaRate}>{line.mvaRate}%</Text>
              <Text style={styles.colTotal}>
                {formatNorwegianCurrency(line.lineTotal)} kr
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Delbeløp</Text>
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
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Totalt</Text>
              <Text style={styles.totalValue}>
                {formatNorwegianCurrency(invoice.total)} kr
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notater</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Payment information */}
        {team.bankAccount && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentLabel}>Betalingsinformasjon</Text>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentKey}>Kontonummer:</Text>
              <Text style={styles.paymentValue}>{team.bankAccount}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentKey}>Beløp:</Text>
              <Text style={styles.paymentValue}>
                {formatNorwegianCurrency(invoice.total)} kr
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentKey}>Forfallsdato:</Text>
              <Text style={styles.paymentValue}>
                {formatNorwegianDate(invoice.dueDate)}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {team.companyName || team.name}
          {team.orgNumber ? ` | Org.nr: ${formatOrgNr(team.orgNumber)}` : ""}
        </Text>
      </Page>
    </Document>
  )
}
