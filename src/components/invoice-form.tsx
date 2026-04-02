"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MVA_RATES } from "@/lib/mva"
import { formatCurrency, kronerToOre, oreToKroner } from "@/lib/utils"
import { createInvoice, updateInvoice } from "@/actions/invoices"
import type { InvoiceFormData } from "@/actions/invoices"
import { PlusCircle, Trash2 } from "lucide-react"
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
  nextInvoiceNumber?: string
  invoice?: {
    id: string
    customerId: string
    issueDate: string
    dueDate: string
    notes: string | null
    invoiceNumber?: number
    kidNumber?: string | null
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

export function InvoiceForm({ customers, nextInvoiceNumber, invoice }: InvoiceFormProps) {
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

  const isEditing = !!invoice

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

  const displayInvoiceNumber = invoice?.invoiceNumber
    ? `INV-${invoice.invoiceNumber.toString().padStart(4, "0")}`
    : nextInvoiceNumber ?? "---"

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing
              ? `Rediger faktura #${invoice.invoiceNumber}`
              : "Opprett ny faktura"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isEditing
              ? "Oppdater fakturadetaljene nedenfor."
              : "Fyll inn detaljene nedenfor for å generere en profesjonell faktura."}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="px-6 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 disabled:opacity-50"
          >
            {isPending
              ? "Lagrer..."
              : isEditing
                ? "Lagre endringer"
                : "Lagre og send"}
          </button>
        </div>
      </div>

      {/* Form error */}
      {errors._form && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {errors._form[0]}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Invoice Details Form */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
            Fakturadetaljer
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Select Client */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="customerId"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Velg kunde
              </label>
              <select
                id="customerId"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="">Velg kunde...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <p className="text-sm text-red-500">{errors.customerId[0]}</p>
              )}
            </div>

            {/* Invoice Number (read-only) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Fakturanummer
              </label>
              <input
                type="text"
                readOnly
                value={displayInvoiceNumber}
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* KID Number (read-only, shown when available) */}
            {invoice?.kidNumber && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  KID-nummer
                </label>
                <input
                  type="text"
                  readOnly
                  value={invoice.kidNumber}
                  className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-mono tracking-wider"
                />
              </div>
            )}

            {/* Issue Date */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="issueDate"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Fakturadato
              </label>
              <input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-primary focus:border-primary transition-all"
              />
              {errors.issueDate && (
                <p className="text-sm text-red-500">{errors.issueDate[0]}</p>
              )}
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="dueDate"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Forfallsdato
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-primary focus:border-primary transition-all"
              />
              {errors.dueDate && (
                <p className="text-sm text-red-500">{errors.dueDate[0]}</p>
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          {!invoice && customerId && (
            <div className="mt-6">
              <InvoiceSuggestions
                customerId={customerId}
                onAccept={(suggestedLines, suggestedNotes) => {
                  setLines(
                    suggestedLines.map((l) => ({
                      description: l.description,
                      quantity: l.quantity,
                      unitPriceKroner: oreToKroner(l.unitPrice),
                      mvaRate: l.mvaRate,
                    }))
                  )
                  if (suggestedNotes) setNotes(suggestedNotes)
                }}
              />
            </div>
          )}

          {/* Notes */}
          <div className="mt-6 flex flex-col gap-1.5">
            <label
              htmlFor="notes"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              Notater
            </label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Valgfrie notater..."
              className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
            Fakturalinjer
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 w-1/2">
                    Beskrivelse
                  </th>
                  <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 px-4 hidden sm:table-cell">
                    Antall
                  </th>
                  <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 px-4 hidden sm:table-cell">
                    Enhetspris
                  </th>
                  <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 px-4 hidden sm:table-cell">
                    MVA
                  </th>
                  <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 pl-4">
                    Sum
                  </th>
                  <th className="w-10 pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lines.map((line, index) => (
                  <tr key={index}>
                    {/* Description */}
                    <td className="py-4">
                      <input
                        type="text"
                        placeholder="Varebeskrivelse..."
                        value={line.description}
                        onChange={(e) =>
                          updateLine(index, "description", e.target.value)
                        }
                        className="w-full border-none bg-transparent focus:ring-0 text-slate-900 dark:text-slate-100 p-0 text-sm placeholder:text-slate-400"
                      />
                      {/* Mobile-only inline fields */}
                      <div className="sm:hidden mt-3 grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-400">
                            Antall
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-400">
                            Enhetspris (kr)
                          </span>
                          <input
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
                            className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                        </div>
                        <div className="flex flex-col gap-1 col-span-2">
                          <span className="text-xs font-medium text-slate-400">
                            MVA-sats
                          </span>
                          <select
                            value={line.mvaRate}
                            onChange={(e) =>
                              updateLine(
                                index,
                                "mvaRate",
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            {MVA_RATES.map((rate) => (
                              <option key={rate.rate} value={rate.rate}>
                                {rate.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>

                    {/* Quantity - Desktop */}
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-16 text-right border-none bg-transparent focus:ring-0 text-slate-900 dark:text-slate-100 p-0 text-sm"
                      />
                    </td>

                    {/* Unit Price - Desktop */}
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <div className="flex items-center justify-end text-sm text-slate-900 dark:text-slate-100">
                        <span className="mr-1">kr</span>
                        <input
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
                          className="w-20 text-right border-none bg-transparent focus:ring-0 p-0 text-sm"
                        />
                      </div>
                    </td>

                    {/* MVA Rate - Desktop */}
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <select
                        value={line.mvaRate}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "mvaRate",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full text-right border-none bg-transparent focus:ring-0 text-slate-900 dark:text-slate-100 p-0 text-sm cursor-pointer"
                      >
                        {MVA_RATES.map((rate) => (
                          <option key={rate.rate} value={rate.rate}>
                            {rate.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Line Total */}
                    <td className="py-4 pl-4 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(
                        lineCalculations[index]?.lineTotalOre ?? 0
                      )}
                    </td>

                    {/* Delete Button */}
                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 1}
                        className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:text-slate-300"
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Item Button */}
          <button
            type="button"
            onClick={addLine}
            className="mt-4 flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors group"
          >
            <PlusCircle className="size-[18px]" />
            <span>Legg til linje</span>
          </button>

          {errors.lines && (
            <p className="mt-2 text-sm text-red-500">{errors.lines[0]}</p>
          )}
        </div>

        {/* Summary Section */}
        <div className="bg-slate-50 dark:bg-slate-900/30 p-6 flex flex-col items-end">
          <div className="w-full md:w-72 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Delbeløp
              </span>
              <span className="text-slate-900 dark:text-slate-100 font-medium">
                {formatCurrency(subtotalOre)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">MVA</span>
              <span className="text-slate-900 dark:text-slate-100 font-medium">
                {formatCurrency(mvaAmountOre)}
              </span>
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                Totalt
              </span>
              <span className="text-xl font-black text-primary">
                {formatCurrency(totalOre)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer Mobile View */}
      <div className="mt-8 flex md:hidden flex-col gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full px-6 py-3 text-sm font-bold text-white bg-primary rounded-lg shadow-sm shadow-primary/20 disabled:opacity-50"
        >
          {isPending
            ? "Lagrer..."
            : isEditing
              ? "Lagre endringer"
              : "Lagre og send"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="w-full px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50"
        >
          Avbryt
        </button>
      </div>
    </div>
  )
}
