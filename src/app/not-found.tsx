import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Siden ble ikke funnet.</p>
      <Link
        href="/"
        className="text-sm underline underline-offset-4 hover:text-primary"
      >
        Tilbake til forsiden
      </Link>
    </div>
  )
}
