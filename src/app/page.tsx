import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <h1 className="text-4xl font-bold tracking-tight">Bokført</h1>
      <p className="mt-2 text-muted-foreground">Regnskapsplattform for små bedrifter</p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Logg inn
      </Link>
    </div>
  );
}
