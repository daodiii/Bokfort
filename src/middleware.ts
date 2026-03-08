import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

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

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  )

  const isAuthPage = authPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  )

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/logg-inn", req.nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
