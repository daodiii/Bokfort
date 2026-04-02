import Link from "next/link"

export function Footer() {
    return (
        <footer className="bg-[#0D1117] border-t border-[#1A2030]">
            <div className="max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-16 py-12 sm:py-16">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
                    <div>
                        <span
                            className="text-[#F2EDE4] text-xl font-bold tracking-tight"
                            style={{ fontFamily: "var(--font-fraunces)" }}
                        >
                            Bokført
                        </span>
                        <p className="mt-2 text-sm text-[#4A5260] max-w-xs leading-relaxed">
                            AI-drevet bokføring for norske bedrifter.
                            Enkelt, presist og alltid oppdatert.
                        </p>
                    </div>
                    <nav className="flex flex-wrap items-center gap-6 text-sm text-[#4A5260]">
                        <Link href="#funksjoner" className="hover:text-[#F2EDE4] transition-colors">
                            Funksjoner
                        </Link>
                        <Link href="#priser" className="hover:text-[#F2EDE4] transition-colors">
                            Priser
                        </Link>
                        <Link href="/login" className="hover:text-[#F2EDE4] transition-colors">
                            Logg inn
                        </Link>
                        <Link
                            href="/register"
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-full transition-colors"
                        >
                            Start gratis
                        </Link>
                    </nav>
                </div>
                <div className="mt-10 pt-6 border-t border-[#1A2030] text-xs text-[#2E3745]">
                    &copy; {new Date().getFullYear()} Bokført. Alle rettigheter reservert.
                </div>
            </div>
        </footer>
    )
}
