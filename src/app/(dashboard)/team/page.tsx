import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users2 } from "lucide-react"
import { InviteForm } from "./invite-form"
import { RemoveMemberButton, RoleSelect } from "./member-actions"

export const metadata = {
  title: "Team | Bokført",
}

export default async function TeamPage() {
  const { team, role, user } = await getCurrentTeam()
  const isAdmin = role === "ADMIN"

  const members = await db.membership.findMany({
    where: { teamId: team.id },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Administrer teammedlemmer og roller
        </p>
      </div>

      {/* Invite form (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Inviter medlem</CardTitle>
            <CardDescription>
              Legg til nye medlemmer i teamet ved hjelp av e-postadressen deres.
              Brukeren må allerede ha en konto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>
      )}

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle>Medlemmer ({members.length})</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Administrer teammedlemmer og deres roller."
              : "Se oversikt over teammedlemmene."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Rolle</TableHead>
                  {isAdmin && <TableHead className="text-right">Handlinger</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((membership) => {
                  const isSelf = membership.userId === user.id
                  return (
                    <TableRow key={membership.id}>
                      <TableCell className="font-medium">
                        {membership.user.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (deg)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {membership.user.email}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <RoleSelect
                            membershipId={membership.id}
                            currentRole={membership.role}
                            isSelf={isSelf}
                          />
                        ) : (
                          <Badge
                            variant={
                              membership.role === "ADMIN"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {membership.role === "ADMIN"
                              ? "Administrator"
                              : "Medlem"}
                          </Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <RemoveMemberButton
                            membershipId={membership.id}
                            memberName={membership.user.name}
                            isSelf={isSelf}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users2 className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Ingen medlemmer</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Inviter medlemmer for å komme i gang.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
