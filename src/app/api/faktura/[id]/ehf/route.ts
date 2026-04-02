import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { validateEhfData } from "@/lib/ehf-validator"
import { generateEhfInvoiceXml, generateEhfCreditNoteXml } from "@/lib/ehf-generator"
import { mapInvoiceToEhfData } from "@/lib/ehf-mapper"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 })
  }

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { team: true },
  })

  if (!membership) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 })
  }

  const team = membership.team

  if (!team.orgNumber) {
    return NextResponse.json(
      { error: "Organisasjonsnummer mangler i innstillinger" },
      { status: 400 }
    )
  }

  const invoice = await db.invoice.findFirst({
    where: { id, teamId: team.id },
    include: {
      customer: true,
      lines: true,
      originalInvoice: { select: { invoiceNumber: true } },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: "Faktura ikke funnet" }, { status: 404 })
  }

  const data = mapInvoiceToEhfData(invoice, team)

  const validation = validateEhfData(data)
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Valideringsfeil", details: validation.errors },
      { status: 400 }
    )
  }

  const xml = data.type === "creditNote"
    ? generateEhfCreditNoteXml(data)
    : generateEhfInvoiceXml(data)

  const filename = `EHF-${invoice.invoiceNumber}-${team.orgNumber}.xml`

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
