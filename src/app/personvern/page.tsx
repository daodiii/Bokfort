import Link from "next/link"

export const metadata = {
  title: "Personvernerklæring – Bokført",
  description: "Personvernerklæring for Bokført",
}

export default function PersonvernPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Tilbake
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold">Personvernerklæring</h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Sist oppdatert: 11. mars 2026
      </p>

      <div className="prose prose-neutral max-w-none space-y-8 text-sm leading-7">
        <section>
          <h2 className="mb-3 text-lg font-semibold">1. Behandlingsansvarlig</h2>
          <p>
            Bokført er behandlingsansvarlig for personopplysningene som samles
            inn og behandles gjennom tjenesten. Har du spørsmål om vår
            behandling av personopplysninger, kan du kontakte oss på{" "}
            <a href="mailto:personvern@bokfort.no" className="text-primary underline-offset-4 hover:underline">
              personvern@bokfort.no
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">2. Hvilke opplysninger vi samler inn</h2>
          <p>Vi behandler følgende kategorier av personopplysninger:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
            <li>Kontaktopplysninger: navn, e-postadresse, telefonnummer</li>
            <li>Bedriftsinformasjon: firmanavn, organisasjonsnummer, adresse</li>
            <li>Finansielle data: fakturaer, utgifter, banktransaksjoner</li>
            <li>Ansattopplysninger: navn, e-post, stilling, lønn, bankkontonummer</li>
            <li>
              Særlige kategorier (ansatte): personnummer, som behandles med
              kryptering og ekstra sikkerhetstiltak
            </li>
            <li>Tekniske data: IP-adresse, innloggingstidspunkt, nettlesertype</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">3. Formål og rettslig grunnlag</h2>
          <div className="space-y-3">
            <div>
              <p className="font-medium">Levere tjenesten</p>
              <p className="text-muted-foreground">
                Behandling av konto- og regnskapsdata er nødvendig for å
                oppfylle avtalen med deg (GDPR art. 6 nr. 1 bokstav b).
              </p>
            </div>
            <div>
              <p className="font-medium">Lønn og ansattadministrasjon</p>
              <p className="text-muted-foreground">
                Behandling av personnummer skjer på grunnlag av ditt samtykke
                og for å oppfylle lovpålagte forpliktelser (GDPR art. 9 nr. 2
                bokstav a og b, samt skatteforvaltningsloven).
              </p>
            </div>
            <div>
              <p className="font-medium">Sikkerhet og misbruksvern</p>
              <p className="text-muted-foreground">
                Logging av innloggingsforsøk skjer på grunnlag av berettiget
                interesse (GDPR art. 6 nr. 1 bokstav f).
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">4. Lagring og sletting</h2>
          <p>
            Kontoopplysninger slettes innen 30 dager etter at kontoen er
            avsluttet. Regnskapsdokumenter (fakturaer, utgifter, lønnsslipper)
            lagres i 5 år i henhold til bokføringsloven § 13. Ansattopplysninger
            lagres så lenge ansettelsesforholdet består, og deretter i 5 år av
            hensyn til skattemessige forpliktelser.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">5. Deling med tredjeparter</h2>
          <p>
            Vi deler ikke personopplysninger med tredjeparter for kommersielle
            formål. Vi benytter følgende databehandlere:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
            <li>Supabase (databasehosting, EU-region)</li>
            <li>Vercel (applikasjonsdrift, EU-region)</li>
            <li>OpenAI (AI-funksjoner — kun anonymiserte sammendrag, ikke persondata)</li>
          </ul>
          <p className="mt-2">
            Alle databehandlere er underlagt databehandleravtaler i samsvar med
            GDPR.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">6. Sikkerhet</h2>
          <p>
            Vi benytter kryptering (AES-256-GCM) for lagring av sensitive
            opplysninger som personnummer. All kommunikasjon skjer over HTTPS.
            Passord lagres som enveiskrypterte hasher (bcrypt). Vi gjennomfører
            jevnlige sikkerhetsvurderinger av tjenesten.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">7. Dine rettigheter</h2>
          <p>Du har rett til å:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
            <li>Kreve innsyn i hvilke opplysninger vi har om deg</li>
            <li>Kreve retting av uriktige opplysninger</li>
            <li>Kreve sletting («retten til å bli glemt»)</li>
            <li>Kreve begrenset behandling</li>
            <li>Motta dine data i et maskinlesbart format (dataportabilitet)</li>
            <li>Protestere mot behandling basert på berettiget interesse</li>
            <li>Trekke tilbake samtykke uten at det påvirker lovligheten av tidligere behandling</li>
          </ul>
          <p className="mt-2">
            Send henvendelser til{" "}
            <a href="mailto:personvern@bokfort.no" className="text-primary underline-offset-4 hover:underline">
              personvern@bokfort.no
            </a>
            . Vi svarer innen 30 dager.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">8. Klage</h2>
          <p>
            Dersom du mener vi behandler personopplysninger i strid med GDPR,
            kan du klage til{" "}
            <a
              href="https://www.datatilsynet.no"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              Datatilsynet
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">9. Endringer</h2>
          <p>
            Vi kan oppdatere denne erklæringen. Ved vesentlige endringer varsles
            du via e-post eller tydelig varsel i tjenesten. Datoen øverst på
            siden viser når erklæringen sist ble oppdatert.
          </p>
        </section>
      </div>
    </div>
  )
}
