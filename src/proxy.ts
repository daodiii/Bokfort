import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

// Edge-compatible auth instance — uses only authConfig (no Prisma/bcrypt)
const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = ["/logg-inn", "/registrer", "/personvern"]

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!req.auth) {
    const loginUrl = new URL("/logg-inn", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
