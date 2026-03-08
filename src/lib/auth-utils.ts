import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) redirect("/logg-inn")
  return session.user
}

export async function getCurrentTeam() {
  const user = await getCurrentUser()

  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { team: true },
  })

  if (!membership) redirect("/logg-inn")

  return {
    user,
    team: membership.team,
    role: membership.role,
  }
}
