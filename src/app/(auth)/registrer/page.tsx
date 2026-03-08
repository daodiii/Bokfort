"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { register, type RegisterState } from "@/actions/auth"
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

const initialState: RegisterState = {}

export default function RegisterPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(register, initialState)

  useEffect(() => {
    if (state.success) {
      router.push("/dashboard")
      router.refresh()
    }
  }, [state.success, router])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Registrer deg</CardTitle>
        <CardDescription>
          Opprett en konto for \u00e5 komme i gang
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.errors?._form && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.errors._form[0]}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Navn</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Ola Nordmann"
              required
              autoComplete="name"
            />
            {state.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="deg@eksempel.no"
              required
              autoComplete="email"
            />
            {state.errors?.email && (
              <p className="text-xs text-destructive">
                {state.errors.email[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Passord</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Minst 8 tegn"
              required
              autoComplete="new-password"
            />
            {state.errors?.password && (
              <p className="text-xs text-destructive">
                {state.errors.password[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="companyName">Firmanavn</Label>
            <Input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Mitt Firma AS"
              required
            />
            {state.errors?.companyName && (
              <p className="text-xs text-destructive">
                {state.errors.companyName[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="orgNumber">Organisasjonsnummer (valgfritt)</Label>
            <Input
              id="orgNumber"
              name="orgNumber"
              type="text"
              placeholder="123 456 789"
            />
            {state.errors?.orgNumber && (
              <p className="text-xs text-destructive">
                {state.errors.orgNumber[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="companyType">Selskapstype</Label>
            <Select name="companyType" defaultValue="ENK" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Velg selskapstype" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENK">Enkeltpersonforetak (ENK)</SelectItem>
                <SelectItem value="AS">Aksjeselskap (AS)</SelectItem>
              </SelectContent>
            </Select>
            {state.errors?.companyType && (
              <p className="text-xs text-destructive">
                {state.errors.companyType[0]}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isPending} className="mt-2 w-full">
            {isPending ? "Registrerer..." : "Registrer deg"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Har du allerede en konto?{" "}
            <Link
              href="/logg-inn"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Logg inn
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
