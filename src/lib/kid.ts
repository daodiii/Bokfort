/**
 * KID-nummer (kundeidentifikasjon) generation and validation
 * using MOD10 (Luhn algorithm) as per Norwegian banking standards.
 *
 * KID format: invoice number padded to 7 digits + 1 check digit = 8-digit KID
 */

/**
 * Calculate MOD10 (Luhn) check digit for a numeric string.
 *
 * Algorithm:
 * 1. Starting from the rightmost digit, double every second digit
 * 2. If doubling results in a number > 9, subtract 9
 * 3. Sum all digits
 * 4. Check digit = (10 - (sum % 10)) % 10
 */
function calculateMod10CheckDigit(digits: string): number {
  let sum = 0
  let doubleNext = true // Start doubling from the rightmost position of input

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10)

    if (doubleNext) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    doubleNext = !doubleNext
  }

  return (10 - (sum % 10)) % 10
}

/**
 * Generate an 8-digit KID number from an invoice number.
 *
 * @param invoiceNumber - The invoice number (positive integer)
 * @returns 8-digit KID string (7-digit padded invoice number + 1 check digit)
 * @throws Error if invoiceNumber is invalid
 */
export function generateKID(invoiceNumber: number): string {
  if (!Number.isInteger(invoiceNumber) || invoiceNumber < 1) {
    throw new Error("Fakturanummer m\u00e5 v\u00e6re et positivt heltall")
  }

  if (invoiceNumber > 9999999) {
    throw new Error("Fakturanummer kan ikke v\u00e6re st\u00f8rre enn 9 999 999")
  }

  const padded = invoiceNumber.toString().padStart(7, "0")
  const checkDigit = calculateMod10CheckDigit(padded)

  return padded + checkDigit.toString()
}

/**
 * Validate a KID number using MOD10 (Luhn) check.
 *
 * @param kid - The KID string to validate
 * @returns true if the KID is valid
 */
export function validateKID(kid: string): boolean {
  if (!kid || kid.length < 2 || !/^\d+$/.test(kid)) {
    return false
  }

  const payload = kid.slice(0, -1)
  const providedCheckDigit = parseInt(kid.slice(-1), 10)
  const expectedCheckDigit = calculateMod10CheckDigit(payload)

  return providedCheckDigit === expectedCheckDigit
}
