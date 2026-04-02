"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Check } from "lucide-react"

const plans = [
    {
        name: "Gratis",
        price: "0",
        period: "kr/mnd",
        description: "Perfekt for å komme i gang",
        features: [
            "Opptil 30 bilag per måned",
            "AI-kategorisering",
            "Kvitteringsskanning",
            "Grunnleggende rapporter",
        ],
        cta: "Kom i gang",
        href: "/register",
        highlighted: false,
    },
    {
        name: "Pro",
        price: "299",
        period: "kr/mnd",
        description: "For selvstendig næringsdrivende",
        features: [
            "Ubegrenset bilag",
            "Bankavstemming",
            "Avviksdeteksjon",
            "Fakturaforslag",
            "AI-rådgiver",
            "Prioritert support",
        ],
        cta: "Start gratis prøveperiode",
        href: "/register",
        highlighted: true,
    },
    {
        name: "Bedrift",
        price: "799",
        period: "kr/mnd",
        description: "For team og voksende bedrifter",
        features: [
            "Alt i Pro",
            "Flerbruker-tilgang",
            "Revisor-eksport",
            "API-tilgang",
            "Dedikert kontaktperson",
        ],
        cta: "Kontakt oss",
        href: "/register",
        highlighted: false,
    },
]

export function Pricing() {
    const sectionRef = useRef<HTMLElement>(null)

    useEffect(() => {
        const els = sectionRef.current?.querySelectorAll(".reveal")
        if (!els) return
        const observer = new IntersectionObserver(
            (entries) =>
                entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
            { threshold: 0.1 }
        )
        els.forEach((el) => observer.observe(el))
        return () => observer.disconnect()
    }, [])

    return (
        <section ref={sectionRef} id="priser" className="relative py-24 sm:py-36 bg-white">
            <div className="max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-16">

                {/* Section header */}
                <div className="mb-14 sm:mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-px w-8 bg-emerald-500 shrink-0" />
                        <span className="text-emerald-600 text-xs font-semibold tracking-[0.15em] uppercase">
                            Priser
                        </span>
                    </div>
                    <h2
                        className="reveal text-slate-900 leading-[0.95] tracking-tight"
                        style={{
                            fontFamily: "var(--font-fraunces)",
                            fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)",
                            fontWeight: 700,
                        }}
                    >
                        Enkel,{" "}
                        <span style={{ color: "#059669" }}>
                            rettferdig
                        </span>{" "}
                        prising.
                    </h2>
                    <p className="reveal reveal-delay-1 mt-5 text-slate-500 text-lg sm:text-xl leading-relaxed max-w-md">
                        Ingen skjulte kostnader. Oppgrader eller avbestill når som helst.
                    </p>
                </div>

                {/* Plans */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {plans.map((plan, i) => (
                        <div
                            key={plan.name}
                            className={`reveal reveal-delay-${Math.min(i + 1, 5)} relative rounded-2xl border p-8 sm:p-9 transition-all duration-300 hover:-translate-y-1 ${
                                plan.highlighted
                                    ? "border-emerald-200 bg-emerald-950 shadow-xl"
                                    : "border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-slate-200"
                            }`}
                        >
                            {plan.highlighted && (
                                <div className="absolute -top-3.5 left-8 px-4 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold tracking-wide">
                                    Mest populær
                                </div>
                            )}

                            <div className="mb-8">
                                <h3
                                    className={`text-base font-semibold mb-1 ${
                                        plan.highlighted ? "text-emerald-300" : "text-slate-500"
                                    }`}
                                >
                                    {plan.name}
                                </h3>
                                <div className="flex items-baseline gap-1.5 mb-2">
                                    <span
                                        className={plan.highlighted ? "text-[#F2EDE4]" : "text-slate-900"}
                                        style={{
                                            fontFamily: "var(--font-fraunces)",
                                            fontSize: "clamp(2.5rem, 4vw, 3.5rem)",
                                            fontWeight: 700,
                                            letterSpacing: "-0.03em",
                                            lineHeight: 1,
                                        }}
                                    >
                                        {plan.price}
                                    </span>
                                    <span className={`text-sm ${plan.highlighted ? "text-emerald-400" : "text-slate-400"}`}>
                                        {plan.period}
                                    </span>
                                </div>
                                <p className={`text-sm ${plan.highlighted ? "text-emerald-400/80" : "text-slate-400"}`}>
                                    {plan.description}
                                </p>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-3">
                                        <div className={`mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center ${
                                            plan.highlighted ? "bg-emerald-700" : "bg-emerald-50"
                                        }`}>
                                            <Check className={`w-2.5 h-2.5 ${plan.highlighted ? "text-emerald-300" : "text-emerald-600"}`} />
                                        </div>
                                        <span className={`text-sm leading-snug ${plan.highlighted ? "text-[#C8D8C8]" : "text-slate-600"}`}>
                                            {f}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={plan.href}
                                className={`block w-full text-center py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    plan.highlighted
                                        ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/40"
                                        : "text-emerald-700 border-2 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50"
                                }`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
