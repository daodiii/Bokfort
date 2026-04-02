import { Hero } from "./components/hero"
import { Features } from "./components/features"
import { HowItWorks } from "./components/how-it-works"
import { Pricing } from "./components/pricing"
import { Footer } from "./components/footer"

export default function LandingPage() {
    return (
        <main>
            <Hero />
            <Features />
            <HowItWorks />
            <Pricing />
            <Footer />
        </main>
    )
}
