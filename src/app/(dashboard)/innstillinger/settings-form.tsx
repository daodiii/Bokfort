"use client"

import { useActionState } from "react"
import {
  updateTeamSettings,
  type TeamSettingsFormState,
} from "@/actions/team"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, FileText, Receipt, Check } from "lucide-react"
import { useState } from "react"

type TeamData = {
  companyName: string
  orgNumber: string
  companyType: string
  address: string
  postalCode: string
  city: string
  bankAccount: string
  logoUrl: string
  invoiceNumberSeq: number
  mvaRegistered: boolean
}

const initialState: TeamSettingsFormState = {}

export function SettingsForm({
  team,
  isAdmin,
}: {
  team: TeamData
  isAdmin: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    updateTeamSettings,
    initialState
  )
  const [mvaRegistered, setMvaRegistered] = useState(team.mvaRegistered)

  return (
    <form action={formAction}>
      {/* Hidden field for mvaRegistered since checkbox needs special handling */}
      <input type="hidden" name="mvaRegistered" value={String(mvaRegistered)} />

      <Tabs defaultValue="firma">
        <TabsList>
          <TabsTrigger value="firma">
            <Building2 className="size-4" />
            Firma
          </TabsTrigger>
          <TabsTrigger value="faktura">
            <FileText className="size-4" />
            Faktura
          </TabsTrigger>
          <TabsTrigger value="mva">
            <Receipt className="size-4" />
            MVA
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Firma (Company) */}
        <TabsContent value="firma">
          <Card>
            <CardHeader>
              <CardTitle>Firmainformasjon</CardTitle>
              <CardDescription>
                Grunnleggende informasjon om firmaet ditt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="companyName">Firmanavn</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  defaultValue={team.companyName}
                  placeholder="Mitt Firma AS"
                  required
                  disabled={!isAdmin}
                />
                {state.errors?.companyName && (
                  <p className="text-xs text-destructive">
                    {state.errors.companyName[0]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="orgNumber">Organisasjonsnummer</Label>
                <Input
                  id="orgNumber"
                  name="orgNumber"
                  type="text"
                  defaultValue={team.orgNumber}
                  placeholder="123 456 789"
                  disabled={!isAdmin}
                />
                {state.errors?.orgNumber && (
                  <p className="text-xs text-destructive">
                    {state.errors.orgNumber[0]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="companyType">Selskapstype</Label>
                <Select
                  name="companyType"
                  defaultValue={team.companyType || "ENK"}
                  disabled={!isAdmin}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Velg selskapstype" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENK">
                      Enkeltpersonforetak (ENK)
                    </SelectItem>
                    <SelectItem value="AS">Aksjeselskap (AS)</SelectItem>
                  </SelectContent>
                </Select>
                {state.errors?.companyType && (
                  <p className="text-xs text-destructive">
                    {state.errors.companyType[0]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  defaultValue={team.address}
                  placeholder="Storgata 1"
                  disabled={!isAdmin}
                />
                {state.errors?.address && (
                  <p className="text-xs text-destructive">
                    {state.errors.address[0]}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="postalCode">Postnummer</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    type="text"
                    defaultValue={team.postalCode}
                    placeholder="0001"
                    disabled={!isAdmin}
                  />
                  {state.errors?.postalCode && (
                    <p className="text-xs text-destructive">
                      {state.errors.postalCode[0]}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="city">Poststed</Label>
                  <Input
                    id="city"
                    name="city"
                    type="text"
                    defaultValue={team.city}
                    placeholder="Oslo"
                    disabled={!isAdmin}
                  />
                  {state.errors?.city && (
                    <p className="text-xs text-destructive">
                      {state.errors.city[0]}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Faktura (Invoice) */}
        <TabsContent value="faktura">
          <Card>
            <CardHeader>
              <CardTitle>Fakturainnstillinger</CardTitle>
              <CardDescription>
                Innstillinger som vises på fakturaene dine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bankAccount">Bankkontonummer</Label>
                <Input
                  id="bankAccount"
                  name="bankAccount"
                  type="text"
                  defaultValue={team.bankAccount}
                  placeholder="1234 56 78901"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Vises på fakturaer som betalingsinformasjon
                </p>
                {state.errors?.bankAccount && (
                  <p className="text-xs text-destructive">
                    {state.errors.bankAccount[0]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="logoUrl">Logo-URL</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  type="url"
                  defaultValue={team.logoUrl}
                  placeholder="https://eksempel.no/logo.png"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  URL til logoen som vises i fakturahodet
                </p>
                {state.errors?.logoUrl && (
                  <p className="text-xs text-destructive">
                    {state.errors.logoUrl[0]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="invoiceNumberStart">
                  Fakturanummer starter fra
                </Label>
                <Input
                  id="invoiceNumberStart"
                  name="invoiceNumberStart"
                  type="number"
                  min={1}
                  defaultValue={team.invoiceNumberSeq}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Neste faktura får dette nummeret
                </p>
                {state.errors?.invoiceNumberStart && (
                  <p className="text-xs text-destructive">
                    {state.errors.invoiceNumberStart[0]}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: MVA (VAT) */}
        <TabsContent value="mva">
          <Card>
            <CardHeader>
              <CardTitle>MVA-innstillinger</CardTitle>
              <CardDescription>
                Merverdiavgift og avgiftssatser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={mvaRegistered}
                  disabled={!isAdmin}
                  onClick={() => setMvaRegistered(!mvaRegistered)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                    mvaRegistered ? "bg-primary" : "bg-input"
                  }`}
                >
                  <span
                    className={`pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      mvaRegistered ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <Label htmlFor="mvaRegistered" className="cursor-pointer" onClick={() => isAdmin && setMvaRegistered(!mvaRegistered)}>
                  MVA-registrert
                </Label>
              </div>

              {mvaRegistered && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">
                    Gjeldende MVA-satser i Norge
                  </p>
                  <div className="grid gap-1.5 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Alminnelig sats</span>
                      <span className="font-medium text-foreground">25 %</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Matvarer</span>
                      <span className="font-medium text-foreground">15 %</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Persontransport, kino, mv.</span>
                      <span className="font-medium text-foreground">12 %</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fritatt (eksport, mv.)</span>
                      <span className="font-medium text-foreground">0 %</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form status and submit */}
      <div className="mt-6 flex items-center gap-4">
        {isAdmin && (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Lagrer..." : "Lagre endringer"}
          </Button>
        )}

        {state.success && (
          <p className="flex items-center gap-1.5 text-sm text-green-600">
            <Check className="size-4" />
            Endringer lagret
          </p>
        )}

        {state.errors?._form && (
          <p className="text-sm text-destructive">{state.errors._form[0]}</p>
        )}
      </div>
    </form>
  )
}
