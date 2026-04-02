import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Bokf\u00f8rt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enkel regnskapsf\u00f8ring for sm\u00e5 bedrifter
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link href="/personvern" className="hover:underline">
          Personvernerklæring
        </Link>
      </p>
    </div>
  )
}
