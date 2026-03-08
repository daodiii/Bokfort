import { renderToBuffer } from "@react-pdf/renderer"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { InvoicePdf } from "@/components/invoice-pdf"
import { NextResponse } from "next/server"
import React from "react"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Authenticate user
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 })
  }

  // Get user's team
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { team: true },
  })

  if (!membership) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 })
  }

  const team = membership.team

  // Get invoice (scoped to team)
  const invoice = await db.invoice.findFirst({
    where: { id, teamId: team.id },
    include: {
      customer: true,
      lines: true,
    },
  })

  if (!invoice) {
    return NextResponse.json(
      { error: "Faktura ikke funnet" },
      { status: 404 }
    )
  }

  // Render PDF to buffer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(InvoicePdf, { invoice, team }) as any
  )

  // Return PDF response
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="faktura-${invoice.invoiceNumber}.pdf"`,
    },
  })
}
