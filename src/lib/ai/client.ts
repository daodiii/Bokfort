import OpenAI from "openai"

const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined
}

function createClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. AI features are unavailable.")
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = client
  return client
}

// Lazy proxy — avoids crashing at module load time when key is missing
export const openai = new Proxy({} as OpenAI, {
  get(_, prop: string | symbol) {
    const client = globalForOpenAI.openai ?? createClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === "function" ? (value as Function).bind(client) : value
  },
})
