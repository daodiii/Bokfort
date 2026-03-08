"use client"

import { useActionState, useState, useTransition } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { lookupBrreg, type CustomerFormState } from "@/actions/customers"
import { Loader2, Search } from "lucide-react"
import Link from "next/link"

type CustomerFormProps = {
  action: (prevState: CustomerFormState, formData: FormData) => Promise<CustomerFormState>
  defaultValues?: {
    name?: string
    email?: string
    phone?: string
    orgNumber?: string
    address?: string
    city?: string
    postalCode?: string
  }
  submitLabel: string
  title: string
}

export function CustomerForm({
  action,
  defaultValues,
  submitLabel,
  title,
}: CustomerFormProps) {
  const [state, formAction, isPending] = useActionState(action, {})
  const [brregPending, startBrregTransition] = useTransition()
  const [brregError, setBrregError] = useState<string | null>(null)

  // Local state for fields that can be auto-filled
  const [name, setName] = useState(defaultValues?.name ?? "")
  const [email, setEmail] = useState(defaultValues?.email ?? "")
  const [phone, setPhone] = useState(defaultValues?.phone ?? "")
  const [orgNumber, setOrgNumber] = useState(defaultValues?.orgNumber ?? "")
  const [address, setAddress] = useState(defaultValues?.address ?? "")
  const [city, setCity] = useState(defaultValues?.city ?? "")
  const [postalCode, setPostalCode] = useState(defaultValues?.postalCode ?? "")

  function handleBrregLookup() {
    setBrregError(null)
    startBrregTransition(async () => {
      const result = await lookupBrreg(orgNumber)
      if (result.success && result.data) {
        setName(result.data.name)
        setOrgNumber(result.data.orgNumber)
        if (result.data.address) setAddress(result.data.address)
        if (result.data.postalCode) setPostalCode(result.data.postalCode)
        if (result.data.city) setCity(result.data.city)
      } else {
        setBrregError(result.error ?? "Oppslag feilet.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          {/* Brreg lookup section */}
          <div className="space-y-2">
            <Label htmlFor="orgNumber">Organisasjonsnummer</Label>
            <div className="flex gap-2">
              <Input
                id="orgNumber"
                name="orgNumber"
                placeholder="123 456 789"
                value={orgNumber}
                onChange={(e) => setOrgNumber(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleBrregLookup}
                disabled={brregPending || orgNumber.replace(/\s/g, "").length < 9}
              >
                {brregPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                <span className="hidden sm:inline">Slå opp</span>
              </Button>
            </div>
            {state.errors?.orgNumber && (
              <p className="text-sm text-destructive">{state.errors.orgNumber[0]}</p>
            )}
            {brregError && (
              <p className="text-sm text-destructive">{brregError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Slå opp i Brønnøysundregistrene for å fylle ut automatisk
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Navn *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Kundenavn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {state.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="kunde@eksempel.no"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {state.errors?.email && (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {state.errors?.phone && (
              <p className="text-sm text-destructive">{state.errors.phone[0]}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              name="address"
              placeholder="Gateadresse"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            {state.errors?.address && (
              <p className="text-sm text-destructive">{state.errors.address[0]}</p>
            )}
          </div>

          {/* Postal code + City */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postnummer</Label>
              <Input
                id="postalCode"
                name="postalCode"
                placeholder="0000"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
              {state.errors?.postalCode && (
                <p className="text-sm text-destructive">{state.errors.postalCode[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Poststed</Label>
              <Input
                id="city"
                name="city"
                placeholder="Oslo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              {state.errors?.city && (
                <p className="text-sm text-destructive">{state.errors.city[0]}</p>
              )}
            </div>
          </div>

          {/* Form error */}
          {state.errors?._form && (
            <p className="text-sm text-destructive">{state.errors._form[0]}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Lagrer...
                </>
              ) : (
                submitLabel
              )}
            </Button>
            <Link href="/kunder" className={buttonVariants({ variant: "outline" })}>Avbryt</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
