import { clsx, type ClassValue } from "clsx"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format øre amount to Norwegian currency string: 1 234,56 kr */
export function formatCurrency(ore: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 2,
  }).format(ore / 100)
}

/** Format date to Norwegian format: dd.mm.yyyy */
export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd.MM.yyyy", { locale: nb })
}

/** Format org number: XXX XXX XXX */
export function formatOrgNumber(orgNr: string): string {
  const digits = orgNr.replace(/\s/g, "")
  if (digits.length !== 9) return orgNr
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
}

/** Convert kroner to øre */
export function kronerToOre(kroner: number): number {
  return Math.round(kroner * 100)
}

/** Convert øre to kroner */
export function oreToKroner(ore: number): number {
  return ore / 100
}
