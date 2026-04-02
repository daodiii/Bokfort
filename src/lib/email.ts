import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Default sender address.
 * Resend requires a verified domain — during development use their test address.
 * Set RESEND_FROM_EMAIL in .env to override with your verified domain sender.
 */
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Bokført <onboarding@resend.dev>"
