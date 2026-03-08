"use client"

import { useState, useTransition } from "react"
import { updateCustomer, deleteCustomer } from "@/actions/customers"
import { CustomerForm } from "@/components/customer-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { formatOrgNumber } from "@/lib/utils"
import { Pencil, Trash2, Mail, Phone, MapPin, Building2 } from "lucide-react"
import Link from "next/link"

type CustomerData = {
  id: string
  name: string
  email: string | null
  phone: string | null
  orgNumber: string | null
  address: string | null
  city: string | null
  postalCode: string | null
}

export function CustomerEditView({
  customer,
  invoiceCount,
}: {
  customer: CustomerData
  invoiceCount: number
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  const boundUpdateAction = updateCustomer.bind(null, customer.id)

  function handleDelete() {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteCustomer(customer.id)
      if (result?.error) {
        setDeleteError(result.error)
      }
    })
  }

  if (isEditing) {
    return (
      <CustomerForm
        action={boundUpdateAction}
        defaultValues={{
          name: customer.name,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          orgNumber: customer.orgNumber ?? "",
          address: customer.address ?? "",
          city: customer.city ?? "",
          postalCode: customer.postalCode ?? "",
        }}
        submitLabel="Lagre endringer"
        title="Rediger kunde"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Customer details card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Kundedetaljer</CardTitle>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" />
              Rediger
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {customer.email && (
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">E-post</p>
                <p>{customer.email}</p>
              </div>
            </div>
          )}

          {customer.phone && (
            <div className="flex items-center gap-3">
              <Phone className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Telefon</p>
                <p>{customer.phone}</p>
              </div>
            </div>
          )}

          {customer.orgNumber && (
            <div className="flex items-center gap-3">
              <Building2 className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Organisasjonsnummer</p>
                <p>{formatOrgNumber(customer.orgNumber)}</p>
              </div>
            </div>
          )}

          {(customer.address || customer.postalCode || customer.city) && (
            <div className="flex items-center gap-3">
              <MapPin className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Adresse</p>
                <p>
                  {[
                    customer.address,
                    [customer.postalCode, customer.city]
                      .filter(Boolean)
                      .join(" "),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>
          )}

          {!customer.email &&
            !customer.phone &&
            !customer.orgNumber &&
            !customer.address &&
            !customer.city && (
              <p className="text-sm text-muted-foreground">
                Ingen tilleggsdetaljer registrert.
              </p>
            )}
        </CardContent>
      </Card>

      {/* Invoices summary */}
      <Card>
        <CardHeader>
          <CardTitle>Fakturaer</CardTitle>
          <CardDescription>
            {invoiceCount === 0
              ? "Denne kunden har ingen fakturaer."
              : `Denne kunden har ${invoiceCount} ${invoiceCount === 1 ? "faktura" : "fakturaer"}.`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Delete section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Faresone</CardTitle>
          <CardDescription>
            Slett denne kunden permanent. Denne handlingen kan ikke angres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deleteError && (
            <p className="text-sm text-destructive mb-4">{deleteError}</p>
          )}
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="destructive">
                  <Trash2 className="size-4" />
                  Slett kunde
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Slett kunde</DialogTitle>
                <DialogDescription>
                  Er du sikker på at du vil slette {customer.name}? Denne
                  handlingen kan ikke angres.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline">Avbryt</Button>}
                />
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Sletter..." : "Ja, slett"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Back link */}
      <Button variant="outline" asChild>
        <Link href="/kunder">Tilbake til kunder</Link>
      </Button>
    </div>
  )
}
