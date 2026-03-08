import { z } from "zod"

const brregResponseSchema = z.object({
  navn: z.string(),
  organisasjonsnummer: z.string(),
  forretningsadresse: z.object({
    adresse: z.array(z.string()).optional(),
    postnummer: z.string().optional(),
    poststed: z.string().optional(),
  }).optional(),
})

export type BrregCompany = {
  name: string
  orgNumber: string
  address: string | null
  postalCode: string | null
  city: string | null
}

export async function lookupCompany(orgNumber: string): Promise<BrregCompany | null> {
  const digits = orgNumber.replace(/\s/g, "")
  if (digits.length !== 9) return null

  try {
    const res = await fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter/${digits}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null

    const data = brregResponseSchema.parse(await res.json())

    return {
      name: data.navn,
      orgNumber: data.organisasjonsnummer,
      address: data.forretningsadresse?.adresse?.join(", ") ?? null,
      postalCode: data.forretningsadresse?.postnummer ?? null,
      city: data.forretningsadresse?.poststed ?? null,
    }
  } catch {
    return null
  }
}
