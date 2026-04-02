"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useMotionValue, useMotionTemplate, motion, useAnimationFrame } from "framer-motion"

const GRID_SIZE = 48

function GridPattern({ offsetX, offsetY }: { offsetX: any; offsetY: any }) {
    return (
        <svg className="w-full h-full">
            <defs>
                <motion.pattern
                    id="hero-grid"
                    width={GRID_SIZE}
                    height={GRID_SIZE}
                    patternUnits="userSpaceOnUse"
                    x={offsetX}
                    y={offsetY}
                >
                    <path
                        d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                    />
                </motion.pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
    )
}

export function Hero() {
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const gridOffsetX = useMotionValue(0)
    const gridOffsetY = useMotionValue(0)

    useAnimationFrame(() => {
        gridOffsetX.set((gridOffsetX.get() + 0.3) % GRID_SIZE)
        gridOffsetY.set((gridOffsetY.get() + 0.3) % GRID_SIZE)
    })

    const maskImage = useMotionTemplate`radial-gradient(380px circle at ${mouseX}px ${mouseY}px, black, transparent)`

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        const { left, top } = e.currentTarget.getBoundingClientRect()
        mouseX.set(e.clientX - left)
        mouseY.set(e.clientY - top)
    }

    return (
        <section
            className="relative min-h-screen bg-[#0D1117] flex flex-col overflow-hidden"
            onMouseMove={handleMouseMove}
        >
            {/* Base grid — always visible, very faint */}
            <div className="absolute inset-0 z-0 opacity-[0.04] text-white">
                <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
            </div>

            {/* Reveal grid — brighter emerald, masked to cursor */}
            <motion.div
                className="absolute inset-0 z-0 opacity-30 text-emerald-400"
                style={{ maskImage, WebkitMaskImage: maskImage }}
            >
                <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
            </motion.div>

            {/* Ambient glows */}
            <div className="absolute -top-32 -right-32 w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full bg-emerald-950/60 blur-[140px] pointer-events-none z-0" />
            <div className="absolute -bottom-20 -left-20 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-emerald-900/20 blur-[120px] pointer-events-none z-0" />

            {/* Top nav bar */}
            <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 lg:px-16 pt-8 pb-4">
                <span
                    className="text-[1.375rem] font-bold text-white tracking-tight"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                >
                    Bokført
                </span>
                <div className="flex items-center gap-2 sm:gap-4">
                    <Link
                        href="/login"
                        className="text-[#7A8490] hover:text-white text-sm font-medium transition-colors px-3 py-2"
                    >
                        Logg inn
                    </Link>
                    <Link
                        href="/register"
                        className="px-4 sm:px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-full transition-all duration-200 hover:-translate-y-px"
                    >
                        Start gratis
                    </Link>
                </div>
            </nav>

            {/* Hero content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-12 sm:py-16">
                <div className="max-w-[1100px] mx-auto w-full">

                    {/* Eyebrow */}
                    <div className="flex items-center gap-3 mb-8 sm:mb-10">
                        <div className="h-px w-10 bg-emerald-500 shrink-0" />
                        <span className="text-emerald-400 text-xs sm:text-sm font-medium tracking-[0.15em] uppercase">
                            AI-drevet bokføring for norske bedrifter
                        </span>
                    </div>

                    {/* Headline */}
                    <h1
                        className="leading-[0.9] tracking-tight text-[#F2EDE4] mb-10 sm:mb-12"
                        style={{
                            fontFamily: "var(--font-fraunces)",
                            fontSize: "clamp(3rem, 8vw, 7.2rem)",
                            fontWeight: 700,
                        }}
                    >
                        Norges{" "}
                        <span className="text-emerald-400">
                            smarteste
                        </span>
                        <br />
                        regnskapsprogram.
                    </h1>

                    {/* Bottom row: description + CTA */}
                    <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16">
                        <p className="text-[#7A8490] text-lg sm:text-xl leading-relaxed max-w-md">
                            La kunstig intelligens ta seg av kvitteringer,
                            kategorisering og rapportering — så du kan fokusere på
                            det du gjør best.
                        </p>

                        <div className="flex flex-col gap-5 lg:ml-auto shrink-0">
                            <Link
                                href="/register"
                                className="group inline-flex items-center gap-3 px-7 sm:px-8 py-4 bg-[#F2EDE4] hover:bg-white text-[#0D1117] font-bold text-base rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 w-fit"
                            >
                                Kom i gang gratis
                                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#4A5260]">
                                <span>Ingen kredittkort</span>
                                <span aria-hidden>·</span>
                                <span>GDPR-kompatibel</span>
                                <span aria-hidden>·</span>
                                <span>Norsk support</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom rule */}
            <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-[#1E2940] to-transparent" />

            {/* Stats row */}
            <div className="relative z-10 px-6 sm:px-10 lg:px-16 py-8">
                <div className="max-w-[1100px] mx-auto w-full">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0 sm:divide-x sm:divide-[#1E2940]">
                        {[
                            { value: "3 min", label: "å behandle en kvittering" },
                            { value: "98%", label: "nøyaktighet på kategorisering" },
                            { value: "10×", label: "raskere enn manuell bokføring" },
                            { value: "0 kr", label: "å komme i gang" },
                        ].map((stat) => (
                            <div key={stat.label} className="sm:px-8 first:pl-0 last:pr-0">
                                <div
                                    className="text-[#F2EDE4] mb-1"
                                    style={{
                                        fontFamily: "var(--font-fraunces)",
                                        fontSize: "clamp(1.5rem, 3vw, 2rem)",
                                        fontWeight: 700,
                                        letterSpacing: "-0.02em",
                                    }}
                                >
                                    {stat.value}
                                </div>
                                <div className="text-[#4A5260] text-xs sm:text-sm leading-snug">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
