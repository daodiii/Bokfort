import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FileText, Calculator } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Rapporter | Bokført",
}

const reports = [
  {
    title: "Resultatregnskap",
    description:
      "Oversikt over inntekter og utgifter i en gitt periode. Se resultat (overskudd eller underskudd).",
    href: "/rapporter/resultat",
    icon: FileText,
  },
  {
    title: "MVA-oppgave",
    description:
      "Oversikt over utgående og inngående MVA per termin. Beregn netto MVA til innbetaling eller til gode.",
    href: "/rapporter/mva",
    icon: Calculator,
  },
]

export default function RapporterPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapporter</h1>
        <p className="text-muted-foreground">
          Generer rapporter for regnskap og avgifter
        </p>
      </div>

      {/* Report cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Link key={report.href} href={report.href}>
              <Card className="transition-colors hover:border-primary/50 hover:bg-muted/50 h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {report.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
