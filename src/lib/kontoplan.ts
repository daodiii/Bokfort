export type DefaultAccount = {
  code: string
  name: string
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
  parentCode?: string
}

/**
 * NS 4102 standard kontoplan — essential accounts for small Norwegian businesses.
 * Full NS 4102 has hundreds of accounts; this seeds the most commonly used ones.
 * Teams can add custom accounts later.
 */
export const NS4102_DEFAULTS: DefaultAccount[] = [
  // ===== EIENDELER (Assets) — 1xxx =====
  { code: "1500", name: "Kundefordringer", type: "ASSET", parentCode: "15" },
  { code: "1580", name: "Avsetning tap på fordringer", type: "ASSET", parentCode: "15" },
  { code: "1900", name: "Kontanter", type: "ASSET", parentCode: "19" },
  { code: "1920", name: "Bankinnskudd", type: "ASSET", parentCode: "19" },
  { code: "1940", name: "Skattetrekkskonto", type: "ASSET", parentCode: "19" },

  // ===== EGENKAPITAL (Equity) — 20xx =====
  { code: "2000", name: "Aksjekapital", type: "EQUITY", parentCode: "20" },
  { code: "2050", name: "Annen egenkapital", type: "EQUITY", parentCode: "20" },

  // ===== GJELD (Liabilities) — 2xxx =====
  { code: "2400", name: "Leverandørgjeld", type: "LIABILITY", parentCode: "24" },
  { code: "2600", name: "Skattetrekk", type: "LIABILITY", parentCode: "26" },
  { code: "2700", name: "Utgående merverdiavgift", type: "LIABILITY", parentCode: "27" },
  { code: "2710", name: "Inngående merverdiavgift", type: "ASSET", parentCode: "27" },
  { code: "2740", name: "Oppgjørskonto merverdiavgift", type: "LIABILITY", parentCode: "27" },
  { code: "2770", name: "Skyldig pensjonspremie", type: "LIABILITY", parentCode: "27" },
  { code: "2780", name: "Skyldig arbeidsgiveravgift", type: "LIABILITY", parentCode: "27" },
  { code: "2900", name: "Annen kortsiktig gjeld", type: "LIABILITY", parentCode: "29" },
  { code: "2910", name: "Gjeld til ansatte", type: "LIABILITY", parentCode: "29" },
  { code: "2920", name: "Skyldig offentlige avgifter", type: "LIABILITY", parentCode: "29" },

  // ===== SALGSINNTEKTER (Revenue) — 3xxx =====
  { code: "3000", name: "Salgsinntekter, avgiftspliktig", type: "REVENUE", parentCode: "30" },
  { code: "3100", name: "Salgsinntekter, avgiftsfri", type: "REVENUE", parentCode: "31" },
  { code: "3200", name: "Salgsinntekter, utenfor avgiftsområdet", type: "REVENUE", parentCode: "32" },
  { code: "3900", name: "Annen driftsinntekt", type: "REVENUE", parentCode: "39" },

  // ===== VAREKOSTNAD — 4xxx =====
  { code: "4000", name: "Varekostnad", type: "EXPENSE", parentCode: "40" },
  { code: "4300", name: "Innkjøp av varer for videresalg", type: "EXPENSE", parentCode: "43" },

  // ===== LØNNSKOSTNADER — 5xxx =====
  { code: "5000", name: "Lønn til ansatte", type: "EXPENSE", parentCode: "50" },
  { code: "5020", name: "Feriepenger", type: "EXPENSE", parentCode: "50" },
  { code: "5400", name: "Arbeidsgiveravgift", type: "EXPENSE", parentCode: "54" },
  { code: "5800", name: "Pensjonskostnader", type: "EXPENSE", parentCode: "58" },
  { code: "5900", name: "Annen personalkostnad", type: "EXPENSE", parentCode: "59" },

  // ===== ANDRE DRIFTSKOSTNADER — 6xxx =====
  { code: "6000", name: "Avskrivning", type: "EXPENSE", parentCode: "60" },
  { code: "6100", name: "Frakt og transportkostnader", type: "EXPENSE", parentCode: "61" },
  { code: "6300", name: "Leie lokale", type: "EXPENSE", parentCode: "63" },
  { code: "6400", name: "Leie maskiner og inventar", type: "EXPENSE", parentCode: "64" },
  { code: "6500", name: "Verktøy og inventar", type: "EXPENSE", parentCode: "65" },
  { code: "6540", name: "Inventar", type: "EXPENSE", parentCode: "65" },
  { code: "6700", name: "Revisjons- og regnskapshonorar", type: "EXPENSE", parentCode: "67" },
  { code: "6800", name: "Kontorrekvisita", type: "EXPENSE", parentCode: "68" },
  { code: "6900", name: "Telefon og datakommunikasjon", type: "EXPENSE", parentCode: "69" },

  // ===== ANDRE DRIFTSKOSTNADER — 7xxx =====
  { code: "7000", name: "Reisekostnad, ikke oppgavepliktig", type: "EXPENSE", parentCode: "70" },
  { code: "7100", name: "Bilkostnader", type: "EXPENSE", parentCode: "71" },
  { code: "7140", name: "Reisekostnad, oppgavepliktig", type: "EXPENSE", parentCode: "71" },
  { code: "7320", name: "Reklamekostnader", type: "EXPENSE", parentCode: "73" },
  { code: "7350", name: "Representasjon", type: "EXPENSE", parentCode: "73" },
  { code: "7400", name: "Kontingenter", type: "EXPENSE", parentCode: "74" },
  { code: "7500", name: "Forsikringspremie", type: "EXPENSE", parentCode: "75" },
  { code: "7700", name: "Annen driftskostnad", type: "EXPENSE", parentCode: "77" },
  { code: "7770", name: "Bank- og kortgebyrer", type: "EXPENSE", parentCode: "77" },

  // ===== FINANSPOSTER — 8xxx =====
  { code: "8000", name: "Renteinntekter", type: "REVENUE", parentCode: "80" },
  { code: "8050", name: "Annen finansinntekt", type: "REVENUE", parentCode: "80" },
  { code: "8100", name: "Rentekostnader", type: "EXPENSE", parentCode: "81" },
  { code: "8170", name: "Andre finanskostnader", type: "EXPENSE", parentCode: "81" },
]

/**
 * Maps common expense category names to NS 4102 account codes.
 * Used when creating journal entries from expenses.
 * Case-insensitive matching.
 */
export const CATEGORY_ACCOUNT_MAP: Record<string, string> = {
  "kontor": "6800",
  "kontorrekvisita": "6800",
  "transport": "6100",
  "frakt": "6100",
  "programvare": "6500",
  "software": "6500",
  "it": "6500",
  "telefon": "6900",
  "forsikring": "7500",
  "reklame": "7320",
  "markedsføring": "7320",
  "leie": "6300",
  "husleie": "6300",
  "reise": "7000",
  "reisekostnad": "7000",
  "bil": "7100",
  "bilkostnader": "7100",
  "drivstoff": "7100",
  "representasjon": "7350",
  "regnskap": "6700",
  "revisor": "6700",
  "mat": "7700",
  "diett": "7140",
  "inventar": "6540",
  "utstyr": "6500",
  "varekjøp": "4300",
  "varer": "4000",
  "bank": "7770",
  "gebyr": "7770",
  "kontingent": "7400",
  "kurs": "5900",
  "opplæring": "5900",
  "avskrivning": "6000",
}

/** Default account code when no category mapping is found */
export const DEFAULT_EXPENSE_ACCOUNT = "7700"

/**
 * Resolve an expense category name to an NS 4102 account code.
 * First checks category.accountCode, then falls back to CATEGORY_ACCOUNT_MAP, then default.
 */
export function resolveExpenseAccountCode(
  categoryName?: string | null,
  categoryAccountCode?: string | null
): string {
  if (categoryAccountCode) return categoryAccountCode

  if (categoryName) {
    const normalized = categoryName.toLowerCase().trim()
    if (CATEGORY_ACCOUNT_MAP[normalized]) return CATEGORY_ACCOUNT_MAP[normalized]
  }

  return DEFAULT_EXPENSE_ACCOUNT
}
