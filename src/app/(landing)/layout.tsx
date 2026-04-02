import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Bokført — AI-drevet bokføring for norske bedrifter",
    description:
        "Smart bokføring med kunstig intelligens. Kvitteringsskanning, automatisk kategorisering, bankavstemming og mer. Prøv gratis.",
}

export default function LandingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "var(--font-fraunces)" }}>
            {children}
        </div>
    )
}
