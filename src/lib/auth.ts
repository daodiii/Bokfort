import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "@/auth.config"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"

// In-memory rate limiter: max 5 failed attempts per email per 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function isRateLimited(email: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(email)

  if (!record || now >= record.resetAt) {
    return false
  }

  return record.count >= MAX_ATTEMPTS
}

function recordFailedAttempt(email: string): void {
  const now = Date.now()
  const record = loginAttempts.get(email)

  if (!record || now >= record.resetAt) {
    loginAttempts.set(email, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    record.count++
  }
}

function clearAttempts(email: string): void {
  loginAttempts.delete(email)
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-post", type: "email" },
        password: { label: "Passord", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string

        if (isRateLimited(email)) return null

        const user = await db.user.findUnique({
          where: { email },
        })

        if (!user) {
          recordFailedAttempt(email)
          return null
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) {
          recordFailedAttempt(email)
          return null
        }

        clearAttempts(email)

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      },
    }),
  ],
})
