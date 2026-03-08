"use client"

import { useActionState } from "react"
import { inviteMember, type InviteFormState } from "@/actions/team"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"

const initialState: InviteFormState = {}

export function InviteForm() {
  const [state, formAction, isPending] = useActionState(
    inviteMember,
    initialState
  )

  return (
    <form action={formAction} className="flex items-end gap-2">
      <div className="flex-1 space-y-1">
        <label htmlFor="invite-email" className="text-sm font-medium">
          E-postadresse
        </label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          placeholder="bruker@eksempel.no"
          required
        />
        {state.errors?.email && (
          <p className="text-xs text-destructive">{state.errors.email[0]}</p>
        )}
      </div>
      <Button type="submit" disabled={isPending}>
        <UserPlus className="size-4" />
        {isPending ? "Inviterer..." : "Inviter"}
      </Button>
      {state.errors?._form && (
        <p className="text-xs text-destructive">{state.errors._form[0]}</p>
      )}
      {state.message && !state.success && !state.errors && (
        <p className="text-xs text-amber-600">{state.message}</p>
      )}
      {state.success && state.message && (
        <p className="text-xs text-green-600">{state.message}</p>
      )}
    </form>
  )
}
