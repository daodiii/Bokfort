export const MVA_RATES = [
  { rate: 25, label: "25% – Standard" },
  { rate: 15, label: "15% – Mat og drikke" },
  { rate: 12, label: "12% – Transport, hotell, kino" },
  { rate: 0, label: "0% – Fritatt" },
] as const

export type MvaRate = 0 | 12 | 15 | 25

/** Calculate MVA amount from a net amount in øre */
export function calculateMva(netAmountOre: number, rate: MvaRate): number {
  return Math.round(netAmountOre * rate / 100)
}

/** Calculate gross amount (net + MVA) in øre */
export function calculateGross(netAmountOre: number, rate: MvaRate): number {
  return netAmountOre + calculateMva(netAmountOre, rate)
}

/** Extract net amount from a gross amount in øre */
export function extractNet(grossAmountOre: number, rate: MvaRate): number {
  return Math.round(grossAmountOre / (1 + rate / 100))
}
