"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Send, Zap, Loader2, CheckCircle } from "lucide-react"
import { sendReminder, createAutoReminders } from "@/actions/payment-reminders"
import { useRouter } from "next/navigation"

export function SendReminderButton({
  reminderId,
  customerName,
  invoiceNumber,
}: {
  reminderId: string
  customerName: string
  invoiceNumber: number
}) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleSend() {
    setLoading(true)
    const result = await sendReminder(reminderId)
    setLoading(false)

    if (result.error) {
      alert(result.error)
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" />
        }
      >
        <Send className="size-3.5" />
        Send
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send purring</DialogTitle>
          <DialogDescription>
            Er du sikker på at du vil sende en betalingspåminnelse til{" "}
            <span className="font-semibold text-slate-900">{customerName}</span>{" "}
            for faktura{" "}
            <span className="font-semibold text-slate-900">
              #INV-{String(invoiceNumber).padStart(3, "0")}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Avbryt
          </DialogClose>
          <Button onClick={handleSend} disabled={loading} className="gap-1.5">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sender...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Send purring
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AutoCreateRemindersButton({
  overdueWithoutReminderCount,
}: {
  overdueWithoutReminderCount: number
}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    count?: number
    error?: string
  } | null>(null)
  const router = useRouter()

  async function handleCreate() {
    setLoading(true)
    setResult(null)
    const res = await createAutoReminders()
    setLoading(false)
    setResult(res)

    if (!res.error) {
      router.refresh()
    }
  }

  if (overdueWithoutReminderCount === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      {result?.count && !result.error ? (
        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <CheckCircle className="size-4" />
          {result.count} {result.count === 1 ? "purring opprettet" : "purringer opprettet"}
        </span>
      ) : null}

      {result?.error ? (
        <span className="text-sm font-medium text-rose-600">
          {result.error}
        </span>
      ) : null}

      <Button
        onClick={handleCreate}
        disabled={loading}
        className="gap-2 text-sm font-bold shadow-sm shadow-primary/20"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Oppretter purringer...
          </>
        ) : (
          <>
            <Zap className="size-4" />
            Opprett purringer automatisk
            <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
              {overdueWithoutReminderCount}
            </span>
          </>
        )}
      </Button>
    </div>
  )
}
