"use client"

import { useEffect, useRef } from "react"
import { Upload, Cpu, CheckCircle } from "lucide-react"

const steps = [
    {
        icon: Upload,
        step: "01",
        title: "Last opp bilag",
        description:
            "Ta bilde av kvitteringen eller last opp PDF — AI-en henter ut all informasjon automatisk.",
    },
    {
        icon: Cpu,
        step: "02",
        title: "AI behandler alt",
        description:
            "Kategorisering, bankavstemming og avvikssjekk skjer i bakgrunnen på sekunder.",
    },
    {
        icon: CheckCircle,
        step: "03",
        title: "Godkjenn og ferdig",
        description:
            "Se over AI-forslaget, godkjenn med ett klikk — regnskapet er oppdatert.",
    },
]

export function HowItWorks() {
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
        <section ref={sectionRef} className="relative py-24 sm:py-36 bg-slate-950">
            <div className="max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-16">

                {/* Section header */}
                <div className="mb-14 sm:mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-px w-8 bg-emerald-500 shrink-0" />
                        <span className="text-emerald-400 text-xs font-semibold tracking-[0.15em] uppercase">
                            Slik fungerer det
                        </span>
                    </div>
                    <h2
                        className="reveal text-[#F2EDE4] leading-[0.95] tracking-tight"
                        style={{
                            fontFamily: "var(--font-fraunces)",
                            fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)",
                            fontWeight: 700,
                        }}
                    >
                        Tre steg.
                        <br />
                        <span style={{ color: "#34D399" }}>
                            Helt automatisk.
                        </span>
                    </h2>
                </div>

                {/* Steps */}
                <div className="grid gap-0 sm:grid-cols-3 sm:divide-x sm:divide-[#1E2940]">
                    {steps.map((s, i) => {
                        const Icon = s.icon
                        return (
                            <div
                                key={s.step}
                                className={`reveal reveal-delay-${Math.min(i + 1, 5)} flex flex-col gap-5 px-0 py-10 sm:py-0 sm:px-10 first:pl-0 last:pr-0 border-t border-[#1E2940] sm:border-t-0 first:border-t-0`}
                            >
                                <div className="flex items-center gap-4">
                                    <span
                                        className="text-[#2A3545] leading-none select-none"
                                        style={{
                                            fontFamily: "var(--font-fraunces)",
                                            fontSize: "clamp(3rem, 5vw, 4.5rem)",
                                            fontWeight: 700,
                                        }}
                                    >
                                        {s.step}
                                    </span>
                                    <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-900/60 flex items-center justify-center text-emerald-400 shrink-0">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                </div>
                                <div>
                                    <h3
                                        className="text-[#F2EDE4] mb-3 leading-tight"
                                        style={{
                                            fontFamily: "var(--font-fraunces)",
                                            fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {s.title}
                                    </h3>
                                    <p className="text-[#6B7885] text-base leading-relaxed">
                                        {s.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
