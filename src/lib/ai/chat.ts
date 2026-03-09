import type OpenAI from "openai"

export const chatSystemPrompt = `Du er en hjelpsom norsk regnskapsassistent for Bokført. Du svarer på norsk.

Du har tilgang til brukerens regnskapsdata gjennom funksjoner. Bruk dem til å svare på spørsmål om:
- Inntekter og utgifter
- Fakturaer og kundeinfo
- MVA-rapporter og resultatregnskap
- Banktransaksjoner

Regler:
- Svar alltid på norsk
- Formater beløp som norske kroner (kr)
- Beløp i databasen er lagret i øre (1 kr = 100 øre), konverter til kroner i svarene
- Vær kortfattet og presis
- Hvis du ikke finner data, si det ærlig
- Du kan IKKE opprette, endre eller slette data — kun lese`

export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getIncomes",
      description: "Hent inntekter i en gitt periode",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Startdato (YYYY-MM-DD)",
          },
          endDate: { type: "string", description: "Sluttdato (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getExpenses",
      description: "Hent utgifter i en gitt periode",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Startdato (YYYY-MM-DD)",
          },
          endDate: { type: "string", description: "Sluttdato (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getInvoices",
      description:
        "Hent fakturaer, valgfritt filtrert etter status og/eller periode",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["DRAFT", "SENT", "PAID", "OVERDUE"],
            description: "Valgfri statusfilter",
          },
          startDate: {
            type: "string",
            description: "Valgfri startdato (YYYY-MM-DD)",
          },
          endDate: {
            type: "string",
            description: "Valgfri sluttdato (YYYY-MM-DD)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProfitAndLoss",
      description: "Generer resultatregnskap for en gitt periode",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Startdato (YYYY-MM-DD)",
          },
          endDate: { type: "string", description: "Sluttdato (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMvaReport",
      description: "Generer MVA-rapport for en gitt periode",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Startdato (YYYY-MM-DD)",
          },
          endDate: { type: "string", description: "Sluttdato (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCustomers",
      description: "Hent liste over alle kunder",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getBankTransactions",
      description:
        "Hent banktransaksjoner, valgfritt filtrert etter koblingstatus",
      parameters: {
        type: "object",
        properties: {
          matched: {
            type: "boolean",
            description: "Filtrer etter koblet (true) eller ukoblet (false)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getExpensesByCategory",
      description:
        "Hent utgifter gruppert etter kategori for en gitt periode",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Startdato (YYYY-MM-DD)",
          },
          endDate: { type: "string", description: "Sluttdato (YYYY-MM-DD)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
]
