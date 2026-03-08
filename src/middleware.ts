import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedPaths = [
  "/dashboard",
  "/faktura",
  "/utgifter",
  "/inntekter",
  "/rapporter",
  "/kunder",
  "/team",
  "/bank-import",
  "/innstillinger",
]

const authPaths = ["/logg-inn", "/registrer"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for session token (NextAuth uses this cookie name)
  const sessionToken = request.cookies.get("authjs.session-token") || request.cookies.get("__Secure-authjs.session-token")
  const isLoggedIn = !!sessionToken

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
  const isAuthPage = authPaths.some((path) => pathname.startsWith(path))

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/logg-inn", request.url))
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
