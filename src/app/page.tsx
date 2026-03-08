import Link from "next/link";
import { FileText, Receipt, Building2, FileBarChart } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: FileText,
    title: "Fakturering",
    description:
      "Opprett og send profesjonelle fakturaer med norsk formattering og MVA-beregning",
  },
  {
    icon: Receipt,
    title: "Utgiftssporing",
    description:
      "Hold oversikt over utgifter med kategorier, MVA-fradrag og kvitteringer",
  },
  {
    icon: Building2,
    title: "Bank-import",
    description:
      "Importer transaksjoner fra banken din via CSV og koble dem automatisk",
  },
  {
    icon: FileBarChart,
    title: "MVA-rapporter",
    description:
      "Generer MVA-oppgaver og resultatregnskap klare for rapportering",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Bokf&oslash;rt
        </h1>

        <div className="flex max-w-xl flex-col gap-3">
          <p className="text-xl font-medium text-foreground/90 sm:text-2xl">
            Enkel bokf&oslash;ring for norske bedrifter
          </p>
          <p className="text-base text-muted-foreground sm:text-lg">
            Alt du trenger for &aring; holde orden p&aring; regnskap, fakturaer
            og MVA
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/registrer"
            className={cn(buttonVariants({ size: "lg" }), "px-6")}
          >
            Kom i gang
          </Link>
          <Link
            href="/logg-inn"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-6")}
          >
            Logg inn
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/40 px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card">
              <CardHeader>
                <feature.icon className="mb-2 size-6 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        Bokf&oslash;rt &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
