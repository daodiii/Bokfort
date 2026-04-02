"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency, kronerToOre } from "@/lib/utils"
import { createTravelExpense } from "@/actions/travel-expenses"
import type { TravelExpenseFormData } from "@/actions/travel-expenses"
import { PlusCircle, Trash2, ArrowLeft, Plane } from "lucide-react"

type ExpenseItem = {
  description: string
  amountKroner: number
  mvaRate: number
  category: "Transport" | "Overnatting" | "Diett" | "Annet"
  date: string
}

const CATEGORIES = [
  { value: "Transport" as const, label: "Transport" },
  { value: "Overnatting" as const, label: "Overnatting" },
  { value: "Diett" as const, label: "Diett" },
  { value: "Annet" as const, label: "Annet" },
]

const MVA_RATES = [
  { rate: 0, label: "0% - Fritatt" },
  { rate: 12, label: "12% - Transport/hotell" },
  { rate: 15, label: "15% - Mat og drikke" },
  { rate: 25, label: "25% - Standard" },
]

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]
}

export default function NyReiseregningPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const [description, setDescription] = useState("")
  const [destination, setDestination] = useState("")
  const [departDate, setDepartDate] = useState(getTodayDate())
  const [returnDate, setReturnDate] = useState("")
  const [notes, setNotes] = useState("")

  const [items, setItems] = useState<ExpenseItem[]>([
    {
      description: "",
      amountKroner: 0,
      mvaRate: 0,
      category: "Transport",
      date: getTodayDate(),
    },
  ])

  function addItem() {
    setItems([
      ...items,
      {
        description: "",
        amountKroner: 0,
        mvaRate: 0,
        category: "Transport",
        date: departDate || getTodayDate(),
      },
    ])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(
    index: number,
    field: keyof ExpenseItem,
    value: string | number
  ) {
    setItems(
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    )
  }

  // Calculate totals
  const itemCalculations = items.map((item) => {
    const amountOre = kronerToOre(item.amountKroner)
    const mvaOre = Math.round(amountOre * item.mvaRate / 100)
    return { amountOre, mvaOre, totalOre: amountOre + mvaOre }
  })

  const subtotalOre = itemCalculations.reduce(
    (sum, ic) => sum + ic.amountOre,
    0
  )
  const totalMvaOre = itemCalculations.reduce((sum, ic) => sum + ic.mvaOre, 0)
  const totalOre = subtotalOre + totalMvaOre

  function handleSubmit(status: "DRAFT" | "SUBMITTED") {
    setErrors({})

    const data: TravelExpenseFormData = {
      description,
      destination: destination || undefined,
      departDate,
      returnDate: returnDate || undefined,
      notes: notes || undefined,
      status,
      items: items.map((item) => ({
        description: item.description,
        amount: item.amountKroner,
        mvaRate: item.mvaRate,
        category: item.category,
        date: item.date,
      })),
    }

    startTransition(async () => {
      const result = await createTravelExpense(data)
      if (result?.errors) {
        setErrors(result.errors as Record<string, string[]>)
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-2"
          >
            <ArrowLeft className="size-4" />
            Tilbake
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            Ny reiseregning
          </h1>
          <p className="text-slate-500 mt-1">
            Registrer reiseutgifter, overnatting og diett.
          </p>
        </div>
        <div className="hidden md:flex gap-3">
          <button
            type="button"
            onClick={() => handleSubmit("DRAFT")}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {isPending ? "Lagrer..." : "Lagre som utkast"}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("SUBMITTED")}
            disabled={isPending}
            className="px-6 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 disabled:opacity-50"
          >
            {isPending ? "Sender..." : "Send inn"}
          </button>
        </div>
      </div>

      {/* Form error */}
      {errors._form && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errors._form[0]}
        </div>
      )}

      {/* Trip Details Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Plane className="size-5 text-primary" />
            Reiseinformasjon
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Description */}
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label
                htmlFor="description"
                className="text-sm font-semibold text-slate-700"
              >
                Beskrivelse <span className="text-red-500">*</span>
              </label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="F.eks. Kundemote i Bergen"
                className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-900 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400"
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description[0]}</p>
              )}
            </div>

            {/* Destination */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="destination"
                className="text-sm font-semibold text-slate-700"
              >
                Destinasjon
              </label>
              <input
                id="destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="F.eks. Bergen"
                className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-900 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Empty space for grid alignment */}
            <div className="hidden md:block" />

            {/* Depart Date */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="departDate"
                className="text-sm font-semibold text-slate-700"
              >
                Avreisedato <span className="text-red-500">*</span>
              </label>
              <input
                id="departDate"
                type="date"
                value={departDate}
                onChange={(e) => setDepartDate(e.target.value)}
                className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-900 focus:ring-primary focus:border-primary transition-all"
              />
              {errors.departDate && (
                <p className="text-sm text-red-500">{errors.departDate[0]}</p>
              )}
            </div>

            {/* Return Date */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="returnDate"
                className="text-sm font-semibold text-slate-700"
              >
                Returdato
              </label>
              <input
                id="returnDate"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-900 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6 flex flex-col gap-1.5">
            <label
              htmlFor="notes"
              className="text-sm font-semibold text-slate-700"
            >
              Notater
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Valgfrie notater om reisen..."
              className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-900 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Expense Items Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Utgiftsposter
          </h2>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Post {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:text-slate-300"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Description */}
                  <div className="sm:col-span-2 lg:col-span-2 flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">
                      Beskrivelse
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                      placeholder="F.eks. Flybillett Oslo-Bergen"
                      className="w-full rounded-lg border-slate-200 bg-white text-sm text-slate-900 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">
                      Belop (kr)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.amountKroner || ""}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "amountKroner",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0,00"
                      className="w-full rounded-lg border-slate-200 bg-white text-sm text-slate-900 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* MVA Rate */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">
                      MVA-sats
                    </label>
                    <select
                      value={item.mvaRate}
                      onChange={(e) =>
                        updateItem(index, "mvaRate", parseInt(e.target.value))
                      }
                      className="w-full rounded-lg border-slate-200 bg-white text-sm text-slate-900 focus:ring-primary focus:border-primary transition-all"
                    >
                      {MVA_RATES.map((rate) => (
                        <option key={rate.rate} value={rate.rate}>
                          {rate.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">
                      Kategori
                    </label>
                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateItem(index, "category", e.target.value)
                      }
                      className="w-full rounded-lg border-slate-200 bg-white text-sm text-slate-900 focus:ring-primary focus:border-primary transition-all"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">
                      Dato
                    </label>
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) =>
                        updateItem(index, "date", e.target.value)
                      }
                      className="w-full rounded-lg border-slate-200 bg-white text-sm text-slate-900 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Item line total */}
                <div className="mt-3 text-right text-sm">
                  <span className="text-slate-500">Sum: </span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(itemCalculations[index]?.amountOre ?? 0)}
                  </span>
                  {item.mvaRate > 0 && (
                    <span className="text-slate-400 ml-2">
                      (MVA: {formatCurrency(itemCalculations[index]?.mvaOre ?? 0)})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Item Button */}
          <button
            type="button"
            onClick={addItem}
            className="mt-4 flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors"
          >
            <PlusCircle className="size-[18px]" />
            <span>Legg til utgiftspost</span>
          </button>

          {errors.items && (
            <p className="mt-2 text-sm text-red-500">{errors.items[0]}</p>
          )}
        </div>

        {/* Summary Section */}
        <div className="bg-slate-50 p-6 flex flex-col items-end border-t border-slate-100">
          <div className="w-full md:w-72 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Delbelop</span>
              <span className="text-slate-900 font-medium">
                {formatCurrency(subtotalOre)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">MVA</span>
              <span className="text-slate-900 font-medium">
                {formatCurrency(totalMvaOre)}
              </span>
            </div>
            <div className="h-px bg-slate-200 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-slate-900">
                Totalt
              </span>
              <span className="text-xl font-black text-primary">
                {formatCurrency(totalOre)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer Mobile */}
      <div className="mt-8 flex flex-col gap-3 md:hidden">
        <button
          type="button"
          onClick={() => handleSubmit("SUBMITTED")}
          disabled={isPending}
          className="w-full px-6 py-3 text-sm font-bold text-white bg-primary rounded-lg shadow-sm shadow-primary/20 disabled:opacity-50"
        >
          {isPending ? "Sender..." : "Send inn"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("DRAFT")}
          disabled={isPending}
          className="w-full px-6 py-3 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg disabled:opacity-50"
        >
          {isPending ? "Lagrer..." : "Lagre som utkast"}
        </button>
      </div>
    </div>
  )
}
