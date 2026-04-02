import { renderToBuffer } from "@react-pdf/renderer"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PayslipPdf } from "@/components/payslip-pdf"
import { NextResponse } from "next/server"
import React from "react"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string; entryId: string }> }
) {
  const { runId, entryId } = await params

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

  // Get the payroll entry with employee and run info
  const entry = await db.payrollEntry.findFirst({
    where: {
      id: entryId,
      payrollRunId: runId,
      payrollRun: { teamId: team.id },
    },
    include: {
      employee: true,
      payrollRun: true,
    },
  })

  if (!entry) {
    return NextResponse.json(
      { error: "Lønnspost ble ikke funnet" },
      { status: 404 }
    )
  }

  const pdfTeam = {
    companyName: team.companyName,
    name: team.name,
    orgNumber: team.orgNumber,
    address: team.address,
    city: team.city,
    postalCode: team.postalCode,
  }

  const pdfEmployee = {
    name: entry.employee.name,
    position: entry.employee.position,
    bankAccount: entry.employee.bankAccount,
  }

  const pdfEntry = {
    grossAmount: entry.grossAmount,
    taxAmount: entry.taxAmount,
    pensionAmount: entry.pensionAmount,
    netAmount: entry.netAmount,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(PayslipPdf, {
      team: pdfTeam,
      employee: pdfEmployee,
      entry: pdfEntry,
      period: entry.payrollRun.period,
      taxPercent: entry.employee.taxPercent,
      pensionPercent: entry.employee.pensionPercent,
    }) as any
  )

  const safeName = entry.employee.name.replace(/\s+/g, "-").toLowerCase()

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="lonnsslipp-${safeName}-${entry.payrollRun.period}.pdf"`,
    },
  })
}
