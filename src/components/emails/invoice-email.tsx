import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components"

type InvoiceEmailProps = {
  companyName: string
  invoiceNumber: number
  totalFormatted: string
  dueDateFormatted: string
  kidNumber: string | null
  bankAccount: string | null
  customerName: string
  isCreditNote: boolean
}

function formatLabel(isCreditNote: boolean) {
  return isCreditNote ? "kreditnota" : "faktura"
}

export function InvoiceEmail({
  companyName,
  invoiceNumber,
  totalFormatted,
  dueDateFormatted,
  kidNumber,
  bankAccount,
  customerName,
  isCreditNote,
}: InvoiceEmailProps) {
  const label = formatLabel(isCreditNote)
  const Label = isCreditNote ? "Kreditnota" : "Faktura"

  return (
    <Html>
      <Head />
      <Preview>
        {`${Label} #${invoiceNumber} fra ${companyName} — ${totalFormatted} kr`}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header bar */}
          <Section style={headerStyle}>
            <Text style={headerTextStyle}>{companyName}</Text>
          </Section>

          {/* Greeting */}
          <Section style={contentStyle}>
            <Heading as="h1" style={headingStyle}>
              {Label} #{invoiceNumber}
            </Heading>
            <Text style={textStyle}>Hei {customerName},</Text>
            <Text style={textStyle}>
              Vedlagt finner du {label} #{invoiceNumber} fra {companyName}.
            </Text>

            {/* Details box */}
            <Section style={detailsBoxStyle}>
              <Row>
                <Column style={detailLabelStyle}>Beloep:</Column>
                <Column style={detailValueStyle}>{totalFormatted} kr</Column>
              </Row>
              <Row>
                <Column style={detailLabelStyle}>Forfallsdato:</Column>
                <Column style={detailValueStyle}>{dueDateFormatted}</Column>
              </Row>
              {kidNumber && (
                <Row>
                  <Column style={detailLabelStyle}>KID-nummer:</Column>
                  <Column style={detailValueStyle}>{kidNumber}</Column>
                </Row>
              )}
              {bankAccount && (
                <Row>
                  <Column style={detailLabelStyle}>Kontonummer:</Column>
                  <Column style={detailValueStyle}>{bankAccount}</Column>
                </Row>
              )}
            </Section>

            {!isCreditNote && (
              <Text style={textStyle}>
                Vennligst betal innen forfallsdato. Ved sporsmal, ta kontakt med
                oss.
              </Text>
            )}

            <Hr style={hrStyle} />

            <Text style={footerTextStyle}>
              Med vennlig hilsen,
              <br />
              {companyName}
            </Text>
          </Section>

          {/* Footer */}
          <Section style={emailFooterStyle}>
            <Text style={emailFooterTextStyle}>
              Denne {label}en ble sendt fra {companyName} via Bokfoert.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// --- Styles ---

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "20px 0",
}

const containerStyle: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
}

const headerStyle: React.CSSProperties = {
  backgroundColor: "#0f2b3c",
  padding: "20px 32px",
}

const headerTextStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "700",
  margin: 0,
}

const contentStyle: React.CSSProperties = {
  padding: "32px",
}

const headingStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 16px 0",
}

const textStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#4b5563",
  margin: "0 0 16px 0",
}

const detailsBoxStyle: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "16px 0 24px 0",
}

const detailLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  padding: "4px 0",
  width: "140px",
}

const detailValueStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#111827",
  padding: "4px 0",
}

const hrStyle: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
}

const footerTextStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#4b5563",
  margin: 0,
}

const emailFooterStyle: React.CSSProperties = {
  padding: "16px 32px",
  backgroundColor: "#f9fafb",
  borderTop: "1px solid #e5e7eb",
}

const emailFooterTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: 0,
  textAlign: "center" as const,
}
