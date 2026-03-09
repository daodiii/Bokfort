"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MVA_RATES } from "@/lib/mva"
import { formatCurrency, kronerToOre, oreToKroner } from "@/lib/utils"
import { createInvoice, updateInvoice } from "@/actions/invoices"
import type { InvoiceFormData } from "@/actions/invoices"
import { Plus, Trash2 } from "lucide-react"
import { InvoiceSuggestions } from "@/components/invoice-suggestions"

type Customer = {
  id: string
  name: string
}

type InvoiceLine = {
  description: string
  quantity: number
  unitPriceKroner: number
  mvaRate: number
}

type InvoiceFormProps = {
  customers: Customer[]
  invoice?: {
    id: string
    customerId: string
    issueDate: string
    dueDate: string
    notes: string | null
    lines: {
      description: string
      quantity: number
      unitPrice: number
      mvaRate: number
    }[]
  }
}

function getDefaultDueDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().split("T")[0]
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]
}

export function InvoiceForm({ customers, invoice }: InvoiceFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const [customerId, setCustomerId] = useState(invoice?.customerId ?? "")
  const [issueDate, setIssueDate] = useState(
    invoice?.issueDate ?? getTodayDate()
  )
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ?? getDefaultDueDate()
  )
  const [notes, setNotes] = useState(invoice?.notes ?? "")

  const [lines, setLines] = useState<InvoiceLine[]>(
    invoice?.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPriceKroner: oreToKroner(l.unitPrice),
      mvaRate: l.mvaRate,
    })) ?? [
      { description: "", quantity: 1, unitPriceKroner: 0, mvaRate: 25 },
    ]
  )

  function addLine() {
    setLines([
      ...lines,
      { description: "", quantity: 1, unitPriceKroner: 0, mvaRate: 25 },
    ])
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return
    setLines(lines.filter((_, i) => i !== index))
  }

  function updateLine(index: number, field: keyof InvoiceLine, value: string | number) {
    setLines(
      lines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      )
    )
  }

  // Calculate totals
  const lineCalculations = lines.map((line) => {
    const lineTotalOre = kronerToOre(line.unitPriceKroner) * line.quantity
    const mvaAmountOre = Math.round(lineTotalOre * line.mvaRate / 100)
    return { lineTotalOre, mvaAmountOre }
  })

  const subtotalOre = lineCalculations.reduce((sum, lc) => sum + lc.lineTotalOre, 0)
  const mvaAmountOre = lineCalculations.reduce((sum, lc) => sum + lc.mvaAmountOre, 0)
  const totalOre = subtotalOre + mvaAmountOre

  function handleSubmit() {
    setErrors({})

    const data: InvoiceFormData = {
      customerId,
      issueDate,
      dueDate,
      notes: notes || undefined,
      lines: lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: kronerToOre(line.unitPriceKroner),
        mvaRate: line.mvaRate,
      })),
    }

    startTransition(async () => {
      const result = invoice
        ? await updateInvoice(invoice.id, data)
        : await createInvoice(data)

      if (result?.errors) {
        setErrors(result.errors as Record<string, string[]>)
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fakturadetaljer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer selector */}
          <div className="space-y-2">
            <Label htmlFor="customerId">Kunde</Label>
            <select
              id="customerId"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">Velg kunde...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="text-sm text-destructive">{errors.customerId[0]}</p>
            )}
          </div>

          {!invoice && customerId && (
            <InvoiceSuggestions
              customerId={customerId}
              onAccept={(suggestedLines, suggestedNotes) => {
                setLines(suggestedLines.map((l) => ({
                  description: l.description,
                  quantity: l.quantity,
                  unitPriceKroner: oreToKroner(l.unitPrice),
                  mvaRate: l.mvaRate,
                })))
                if (suggestedNotes) setNotes(suggestedNotes)
              }}
            />
          )}

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Fakturadato</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
              {errors.issueDate && (
                <p className="text-sm text-destructive">{errors.issueDate[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Forfallsdato</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {errors.dueDate && (
                <p className="text-sm text-destructive">{errors.dueDate[0]}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notater</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Valgfrie notater..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle>Linjer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Line items header (desktop) */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_80px_120px_120px_100px_40px] sm:gap-2 sm:text-sm sm:font-medium sm:text-muted-foreground">
            <span>Beskrivelse</span>
            <span>Antall</span>
            <span>Enhetspris (kr)</span>
            <span>MVA-sats</span>
            <span className="text-right">Sum</span>
            <span />
          </div>

          {lines.map((line, index) => (
            <div key={index} className="space-y-2 sm:space-y-0">
              <div className="grid gap-2 sm:grid-cols-[1fr_80px_120px_120px_100px_40px]">
                <div>
                  <Label className="sm:hidden text-xs text-muted-foreground">Beskrivelse</Label>
                  <Input
                    placeholder="Beskrivelse..."
                    value={line.description}
                    onChange={(e) =>
                      updateLine(index, "description", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs text-muted-foreground">Antall</Label>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, "quantity", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs text-muted-foreground">Enhetspris (kr)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPriceKroner}
                    onChange={(e) =>
                      updateLine(
                        index,
                        "unitPriceKroner",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="sm:hidden text-xs text-muted-foreground">MVA-sats</Label>
                  <select
                    value={line.mvaRate}
                    onChange={(e) =>
                      updateLine(index, "mvaRate", parseInt(e.target.value))
                    }
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    {MVA_RATES.map((rate) => (
                      <option key={rate.rate} value={rate.rate}>
                        {rate.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-right text-sm font-medium leading-8">
                  <Label className="sm:hidden text-xs text-muted-foreground">Sum</Label>
                  {formatCurrency(lineCalculations[index]?.lineTotalOre ?? 0)}
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeLine(index)}
                    disabled={lines.length <= 1}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              {index < lines.length - 1 && (
                <Separator className="sm:hidden mt-2" />
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addLine} className="w-full sm:w-auto">
            <Plus className="size-4" />
            Legg til linje
          </Button>

          {errors.lines && (
            <p className="text-sm text-destructive">{errors.lines[0]}</p>
          )}

          {/* Totals */}
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delbeløp</span>
              <span>{formatCurrency(subtotalOre)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">MVA</span>
              <span>{formatCurrency(mvaAmountOre)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Totalt</span>
              <span>{formatCurrency(totalOre)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form error */}
      {errors._form && (
        <p className="text-sm text-destructive">{errors._form[0]}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Avbryt
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Lagrer..." : "Lagre"}
        </Button>
      </div>
    </div>
  )
}
