import { getCurrentTeam } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { formatOrgNumber } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Users } from "lucide-react"
import Link from "next/link"
import { CustomerSearch } from "./customer-search"

export const metadata = {
  title: "Kunder | Bokført",
}

export default async function KunderPage({
  searchParams,
}: {
  searchParams: Promise<{ sok?: string }>
}) {
  const { team } = await getCurrentTeam()
  const params = await searchParams
  const search = params.sok ?? ""

  const customers = await db.customer.findMany({
    where: {
      teamId: team.id,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { orgNumber: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  })

  const hasCustomers = customers.length > 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kunder</h1>
          <p className="text-muted-foreground">
            Administrer kundene dine
          </p>
        </div>
        <Link href="/kunder/ny" className={buttonVariants({ variant: "default" })}>
            <Plus className="size-4" />
            Ny kunde
        </Link>
      </div>

      {/* Search */}
      <CustomerSearch defaultValue={search} />

      {/* Customer table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {search
              ? `Søkeresultater (${customers.length})`
              : `Alle kunder (${customers.length})`}
          </CardTitle>
          {!hasCustomers && !search && (
            <CardDescription>
              Du har ingen kunder ennå. Opprett din første kunde for å komme i gang.
            </CardDescription>
          )}
          {!hasCustomers && search && (
            <CardDescription>
              Ingen kunder samsvarer med søket ditt.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hasCustomers ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Org.nr.</TableHead>
                  <TableHead>Poststed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link
                        href={`/kunder/${customer.id}`}
                        className="font-medium hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.email ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.orgNumber
                        ? formatOrgNumber(customer.orgNumber)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.city ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">
                {search ? "Ingen treff" : "Ingen kunder ennå"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {search
                  ? "Prøv å endre søket ditt."
                  : "Opprett din første kunde for å komme i gang med fakturering."}
              </p>
              {!search && (
                <Link href="/kunder/ny" className={buttonVariants({ variant: "default" }) + " mt-4"}>
                    <Plus className="size-4" />
                    Ny kunde
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
