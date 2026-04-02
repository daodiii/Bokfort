/**
 * SAF-T v1.30 Standard Tax Code mapping for Norwegian MVA rates.
 * Maps internal MVA rates to Skatteetaten StandardTaxCode values.
 */

/** Output (sales) tax codes — used on invoices/revenue */
export const OUTPUT_TAX_CODES: Record<number, { standardTaxCode: string; description: string }> = {
  25: { standardTaxCode: "3", description: "Utgående MVA, alminnelig sats 25%" },
  15: { standardTaxCode: "31", description: "Utgående MVA, middels sats 15%" },
  12: { standardTaxCode: "33", description: "Utgående MVA, lav sats 12%" },
  0: { standardTaxCode: "5", description: "Ingen utgående MVA, nullsats" },
}

/** Input (purchase) tax codes — used on expenses/purchases */
export const INPUT_TAX_CODES: Record<number, { standardTaxCode: string; description: string }> = {
  25: { standardTaxCode: "1", description: "Inngående MVA, alminnelig sats 25%" },
  15: { standardTaxCode: "11", description: "Inngående MVA, middels sats 15%" },
  12: { standardTaxCode: "13", description: "Inngående MVA, lav sats 12%" },
  0: { standardTaxCode: "0", description: "Ingen MVA-behandling" },
}

/**
 * GroupingCategory mapping for NS 4102 account ranges.
 * Required by SAF-T v1.30 (replaces StandardAccountID from v1.20).
 * Maps account code ranges to naeringsspesifikasjon category codes.
 */
export function getGroupingCategory(accountCode: string): { category: string; code: string } {
  const num = parseInt(accountCode)

  // Fixed assets 1000-1399
  if (num >= 1000 && num < 1400) return { category: "balanseverdiForAnleggsmiddel", code: accountCode }
  // Current assets 1400-1999
  if (num >= 1400 && num < 2000) return { category: "balanseverdiForOmloepsmiddel", code: accountCode }
  // Equity 2000-2099
  if (num >= 2000 && num < 2100) return { category: "sumEgenkapital", code: accountCode }
  // Liabilities 2100-2999
  if (num >= 2100 && num < 3000) return { category: "sumGjeld", code: accountCode }
  // Sales revenue 3000-3999
  if (num >= 3000 && num < 4000) return { category: "sumDriftsinntekt", code: accountCode }
  // Cost of goods 4000-4999
  if (num >= 4000 && num < 5000) return { category: "sumVarekostnad", code: accountCode }
  // Payroll 5000-5999
  if (num >= 5000 && num < 6000) return { category: "sumLoennskostnad", code: accountCode }
  // Operating expenses 6000-7999
  if (num >= 6000 && num < 8000) return { category: "sumAnnenDriftskostnad", code: accountCode }
  // Financial items 8000-8999
  if (num >= 8000 && num < 9000) return { category: "sumFinanspost", code: accountCode }

  return { category: "annet", code: accountCode }
}

/**
 * Format a date as YYYY-MM-DD for SAF-T xs:date type.
 */
export function formatSaftDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Format øre amount to SAF-T monetary (decimal with 2 fraction digits).
 * SAF-T uses positive decimal values, e.g. "12500.00" for 125 NOK.
 */
export function oreToSaftAmount(ore: number): string {
  return (ore / 100).toFixed(2)
}
