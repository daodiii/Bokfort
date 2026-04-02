import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/crypto"
import { notFound } from "next/navigation"
import { EditEmployeeForm } from "./edit-employee-form"

export const metadata = {
  title: "Rediger ansatt | Bokført",
}

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { team } = await getCurrentTeam()

  const employee = await db.employee.findFirst({
    where: { id, teamId: team.id },
  })

  if (!employee) {
    notFound()
  }

  const decryptedPersonnummer = employee.personnummer
    ? decrypt(employee.personnummer)
    : ""

  const serializedEmployee = {
    id: employee.id,
    name: employee.name,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    personnummer: decryptedPersonnummer,
    position: employee.position ?? "",
    department: employee.department ?? "",
    startDate: employee.startDate.toISOString().split("T")[0],
    monthlySalary: employee.monthlySalary / 100,
    taxPercent: employee.taxPercent,
    pensionPercent: employee.pensionPercent,
    bankAccount: employee.bankAccount ?? "",
  }

  return <EditEmployeeForm employee={serializedEmployee} />
}
