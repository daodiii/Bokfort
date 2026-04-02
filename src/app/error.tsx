"use client"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Noe gikk galt</h1>
      <p className="text-muted-foreground">En uventet feil oppstod.</p>
      <button
        onClick={reset}
        className="text-sm underline underline-offset-4 hover:text-primary"
      >
        Prøv igjen
      </button>
    </div>
  )
}
