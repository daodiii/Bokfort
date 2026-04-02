"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ArrowUpRight } from "lucide-react"

interface Feature {
    title: string
    description: string
    tag: string
    link: string
    image: string
}

const features: Feature[] = [
    {
        title: "Kvitteringsskanning",
        description: "Last opp et bilde — AI-en leser beløp, dato og MVA automatisk.",
        tag: "OCR",
        link: "#",
        image: "/images/ai-receipt-scan.png",
    },
    {
        title: "Smart kategorisering",
        description: "Hver transaksjon får riktig kategori basert på historikk.",
        tag: "Auto",
        link: "#",
        image: "/images/ai-categorization.png",
    },
    {
        title: "Bankavstemming",
        description: "Automatisk matching av banktransaksjoner mot bilag.",
        tag: "Matching",
        link: "#",
        image: "/images/ai-reconciliation.png",
    },
    {
        title: "Avviksdeteksjon",
        description: "Varsler om uvanlige utgifter, manglende kvitteringer og feil.",
        tag: "Sikkerhet",
        link: "#",
        image: "/images/ai-anomaly.png",
    },
    {
        title: "Fakturaforslag",
        description: "AI genererer fakturalinjer basert på kundens historikk.",
        tag: "Forslag",
        link: "#",
        image: "/images/ai-invoice.png",
    },
    {
        title: "AI-rådgiver",
        description: "Spør om mva, fradrag eller regnskap — på norsk, når som helst.",
        tag: "Chat",
        link: "#",
        image: "/images/ai-chat.png",
    },
]

export function Features() {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [smoothPosition, setSmoothPosition] = useState({ x: 0, y: 0 })
    const [isVisible, setIsVisible] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<number | null>(null)
    const sectionRef = useRef<HTMLElement>(null)

    useEffect(() => {
        const lerp = (start: number, end: number, factor: number) =>
            start + (end - start) * factor
        const animate = () => {
            setSmoothPosition((prev) => ({
                x: lerp(prev.x, mousePosition.x, 0.15),
                y: lerp(prev.y, mousePosition.y, 0.15),
            }))
            animationRef.current = requestAnimationFrame(animate)
        }
        animationRef.current = requestAnimationFrame(animate)
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [mousePosition])

    useEffect(() => {
        const els = sectionRef.current?.querySelectorAll(".reveal")
        if (!els) return
        const observer = new IntersectionObserver(
            (entries) =>
                entries.forEach(
                    (e) => e.isIntersecting && e.target.classList.add("visible")
                ),
            { threshold: 0.1 }
        )
        els.forEach((el) => observer.observe(el))
        return () => observer.disconnect()
    }, [])

    const handleMouseMove = (e: React.MouseEvent) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }
    }

    return (
        <section
            ref={sectionRef}
            id="funksjoner"
            className="relative py-24 sm:py-36 bg-white"
        >
            <div className="max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-16">

                {/* Section header */}
                <div className="mb-14 sm:mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-px w-8 bg-emerald-500 shrink-0" />
                        <span className="text-emerald-600 text-xs font-semibold tracking-[0.15em] uppercase">
                            Funksjoner
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
                        AI som gjør{" "}
                        <span className="text-emerald-600">
                            regnskapet
                        </span>
                        <br />for deg.
                    </h2>
                    <p className="reveal reveal-delay-1 mt-5 text-slate-500 text-lg sm:text-xl leading-relaxed max-w-lg">
                        Seks kraftige AI-funksjoner som sparer deg tid og reduserer feil.
                    </p>
                </div>

                {/* Interactive feature list */}
                <div
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    className="reveal reveal-delay-2 relative w-full max-w-3xl"
                >
                    {/* Floating preview */}
                    <div
                        className="pointer-events-none fixed z-50 overflow-hidden rounded-2xl shadow-2xl"
                        style={{
                            left: containerRef.current?.getBoundingClientRect().left ?? 0,
                            top: containerRef.current?.getBoundingClientRect().top ?? 0,
                            transform: `translate3d(${smoothPosition.x + 28}px, ${smoothPosition.y - 130}px, 0)`,
                            opacity: isVisible ? 1 : 0,
                            scale: isVisible ? 1 : 0.85,
                            transition: "opacity 0.25s cubic-bezier(0.4,0,0.2,1), scale 0.25s cubic-bezier(0.4,0,0.2,1)",
                        }}
                    >
                        <div className="relative w-[360px] h-[230px] bg-white rounded-2xl overflow-hidden ring-1 ring-slate-200">
                            {features.map((feature, index) => (
                                <img
                                    key={feature.title}
                                    src={feature.image}
                                    alt={feature.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out"
                                    style={{
                                        opacity: hoveredIndex === index ? 1 : 0,
                                        scale: hoveredIndex === index ? 1 : 1.08,
                                        filter: hoveredIndex === index ? "none" : "blur(8px)",
                                    }}
                                />
                            ))}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                        </div>
                    </div>

                    {/* Feature list */}
                    <div className="space-y-0">
                        {features.map((feature, index) => (
                            <a
                                key={feature.title}
                                href={feature.link}
                                className="group block"
                                onMouseEnter={() => { setHoveredIndex(index); setIsVisible(true) }}
                                onMouseLeave={() => { setHoveredIndex(null); setIsVisible(false) }}
                            >
                                <div className="relative py-6 sm:py-7 border-t border-slate-100 transition-all duration-300 ease-out">
                                    {/* Hover bg */}
                                    <div
                                        className={`absolute inset-0 -mx-4 px-4 bg-emerald-50/70 rounded-xl transition-all duration-300 ease-out ${
                                            hoveredIndex === index ? "opacity-100" : "opacity-0"
                                        }`}
                                    />
                                    <div className="relative flex items-center justify-between gap-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <h3
                                                    className="text-slate-900 font-semibold leading-none"
                                                    style={{
                                                        fontFamily: "var(--font-fraunces)",
                                                        fontSize: "clamp(1.125rem, 1.75vw, 1.375rem)",
                                                    }}
                                                >
                                                    {feature.title}
                                                </h3>
                                                <ArrowUpRight
                                                    className={`w-4 h-4 text-emerald-600 shrink-0 transition-all duration-300 ${
                                                        hoveredIndex === index
                                                            ? "opacity-100 translate-x-0 translate-y-0"
                                                            : "opacity-0 -translate-x-2 translate-y-2"
                                                    }`}
                                                />
                                            </div>
                                            <p
                                                className={`text-base leading-relaxed transition-colors duration-300 ${
                                                    hoveredIndex === index ? "text-slate-600" : "text-slate-400"
                                                }`}
                                            >
                                                {feature.description}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 ${
                                                hoveredIndex === index
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-slate-100 text-slate-400"
                                            }`}
                                        >
                                            {feature.tag}
                                        </span>
                                    </div>
                                </div>
                            </a>
                        ))}
                        <div className="border-t border-slate-100" />
                    </div>
                </div>
            </div>
        </section>
    )
}
