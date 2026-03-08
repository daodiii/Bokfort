"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { removeMember, updateMemberRole } from "@/actions/team"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function RemoveMemberButton({
  membershipId,
  memberName,
  isSelf,
}: {
  membershipId: string
  memberName: string
  isSelf: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRemove() {
    if (isSelf) {
      setError("Du kan ikke fjerne deg selv.")
      return
    }

    if (!confirm(`Er du sikker på at du vil fjerne ${memberName} fra teamet?`))
      return

    startTransition(async () => {
      const result = await removeMember(membershipId)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="destructive"
        size="xs"
        onClick={handleRemove}
        disabled={isPending || isSelf}
        title={isSelf ? "Du kan ikke fjerne deg selv" : "Fjern medlem"}
      >
        <Trash2 className="size-3" />
        {isPending ? "Fjerner..." : "Fjern"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function RoleSelect({
  membershipId,
  currentRole,
  isSelf,
}: {
  membershipId: string
  currentRole: "ADMIN" | "MEMBER"
  isSelf: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as "ADMIN" | "MEMBER"
    if (newRole === currentRole) return

    startTransition(async () => {
      const result = await updateMemberRole(membershipId, newRole)
      if (result.error) {
        setError(result.error)
      } else {
        setError(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={currentRole}
        onChange={handleChange}
        disabled={isPending || isSelf}
        className="h-7 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        title={isSelf ? "Du kan ikke endre din egen rolle" : "Endre rolle"}
      >
        <option value="ADMIN">Administrator</option>
        <option value="MEMBER">Medlem</option>
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
