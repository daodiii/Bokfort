import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { ProjectForm } from "../project-form"

export const metadata = {
  title: "Nytt prosjekt | Bokført",
}

export default async function NyttProsjektPage() {
  const { team } = await getCurrentTeam()

  const customers = await db.customer.findMany({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return <ProjectForm customers={customers} />
}
