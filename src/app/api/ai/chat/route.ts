import { openai } from "@/lib/ai/client"
import { chatSystemPrompt, chatTools } from "@/lib/ai/chat"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type OpenAI from "openai"

export const runtime = "nodejs"

async function getTeamForUser(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId },
    include: { team: true },
  })
  return membership?.team
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  teamId: string
): Promise<string> {
  const limit = 20

  switch (name) {
    case "getIncomes": {
      const incomes = await db.income.findMany({
        where: {
          teamId,
          date: {
            gte: new Date(args.startDate as string),
            lte: new Date(args.endDate as string),
          },
        },
        take: limit,
        orderBy: { date: "desc" },
        select: { description: true, amount: true, source: true, date: true },
      })
      const total = await db.income.aggregate({
        where: {
          teamId,
          date: {
            gte: new Date(args.startDate as string),
            lte: new Date(args.endDate as string),
          },
        },
        _sum: { amount: true },
        _count: true,
      })
      return JSON.stringify({
        incomes,
        total: total._sum.amount ?? 0,
        count: total._count,
      })
    }

    case "getExpenses": {
      const expenses = await db.expense.findMany({
        where: {
          teamId,
          date: {
            gte: new Date(args.startDate as string),
            lte: new Date(args.endDate as string),
          },
        },
        take: limit,
        orderBy: { date: "desc" },
        include: { category: { select: { name: true } } },
      })
      const total = await db.expense.aggregate({
        where: {
          teamId,
          date: {
            gte: new Date(args.startDate as string),
            lte: new Date(args.endDate as string),
          },
        },
        _sum: { amount: true },
        _count: true,
      })
      return JSON.stringify({
        expenses: expenses.map((e: { description: string; amount: number; mvaRate: number; category: { name: string } | null; date: Date }) => ({
          description: e.description,
          amount: e.amount,
          mvaRate: e.mvaRate,
          category: e.category?.name,
          date: e.date,
        })),
        total: total._sum.amount ?? 0,
        count: total._count,
      })
    }

    case "getInvoices": {
      const where: Record<string, unknown> = { teamId }
      if (args.status) where.status = args.status
      if (args.startDate && args.endDate) {
        where.issueDate = {
          gte: new Date(args.startDate as string),
          lte: new Date(args.endDate as string),
        }
      }
      const invoices = await db.invoice.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } } },
      })
      return JSON.stringify(
        invoices.map((i: { invoiceNumber: number; customer: { name: string }; status: string; total: number; issueDate: Date; dueDate: Date }) => ({
          invoiceNumber: i.invoiceNumber,
          customer: i.customer.name,
          status: i.status,
          total: i.total,
          issueDate: i.issueDate,
          dueDate: i.dueDate,
        }))
      )
    }

    case "getProfitAndLoss": {
      const [incomeTotal, expenseTotal] = await Promise.all([
        db.income.aggregate({
          where: {
            teamId,
            date: {
              gte: new Date(args.startDate as string),
              lte: new Date(args.endDate as string),
            },
          },
          _sum: { amount: true },
        }),
        db.expense.aggregate({
          where: {
            teamId,
            date: {
              gte: new Date(args.startDate as string),
              lte: new Date(args.endDate as string),
            },
          },
          _sum: { amount: true },
        }),
      ])
      return JSON.stringify({
        totalIncome: incomeTotal._sum.amount ?? 0,
        totalExpenses: expenseTotal._sum.amount ?? 0,
        profit:
          (incomeTotal._sum.amount ?? 0) - (expenseTotal._sum.amount ?? 0),
      })
    }

    case "getMvaReport": {
      const [invoiceLines, expenses] = await Promise.all([
        db.invoiceLine.findMany({
          where: {
            invoice: {
              teamId,
              status: { in: ["SENT", "PAID"] },
              issueDate: {
                gte: new Date(args.startDate as string),
                lte: new Date(args.endDate as string),
              },
            },
          },
          select: { mvaRate: true, mvaAmount: true, lineTotal: true },
        }),
        db.expense.findMany({
          where: {
            teamId,
            date: {
              gte: new Date(args.startDate as string),
              lte: new Date(args.endDate as string),
            },
          },
          select: { mvaRate: true, mvaAmount: true, amount: true },
        }),
      ])

      const outgoing = new Map<number, number>()
      for (const line of invoiceLines) {
        outgoing.set(
          line.mvaRate,
          (outgoing.get(line.mvaRate) ?? 0) + line.mvaAmount
        )
      }

      const incoming = new Map<number, number>()
      for (const exp of expenses) {
        incoming.set(
          exp.mvaRate,
          (incoming.get(exp.mvaRate) ?? 0) + exp.mvaAmount
        )
      }

      const totalOutgoing = [...outgoing.values()].reduce(
        (s, v) => s + v,
        0
      )
      const totalIncoming = [...incoming.values()].reduce(
        (s, v) => s + v,
        0
      )

      return JSON.stringify({
        outgoing: Object.fromEntries(outgoing),
        incoming: Object.fromEntries(incoming),
        totalOutgoing,
        totalIncoming,
        netMva: totalOutgoing - totalIncoming,
      })
    }

    case "getCustomers": {
      const customers = await db.customer.findMany({
        where: { teamId },
        select: { name: true, email: true, orgNumber: true },
        take: limit,
      })
      return JSON.stringify(customers)
    }

    case "getBankTransactions": {
      const where: Record<string, unknown> = { teamId }
      if (typeof args.matched === "boolean") where.matched = args.matched
      const txs = await db.bankTransaction.findMany({
        where,
        take: limit,
        orderBy: { date: "desc" },
        select: {
          description: true,
          amount: true,
          date: true,
          matched: true,
        },
      })
      const count = await db.bankTransaction.count({ where })
      return JSON.stringify({ transactions: txs, totalCount: count })
    }

    case "getExpensesByCategory": {
      const expenses = await db.expense.findMany({
        where: {
          teamId,
          date: {
            gte: new Date(args.startDate as string),
            lte: new Date(args.endDate as string),
          },
        },
        include: { category: { select: { name: true } } },
      })

      const byCategory = new Map<string, number>()
      for (const exp of expenses) {
        const catName = exp.category?.name ?? "Ukategorisert"
        byCategory.set(
          catName,
          (byCategory.get(catName) ?? 0) + exp.amount
        )
      }

      return JSON.stringify(Object.fromEntries(byCategory))
    }

    default:
      return JSON.stringify({ error: "Unknown function" })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const team = await getTeamForUser(session.user.id)
  if (!team) {
    return new Response("No team", { status: 403 })
  }

  const { messages } = (await req.json()) as {
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  }

  const allMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: chatSystemPrompt },
    ...messages.slice(-20),
  ]

  // Function calling loop (non-streaming)
  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: allMessages,
    tools: chatTools,
    stream: false,
  })

  let iterations = 0
  while (response.choices[0]?.message.tool_calls && iterations < 5) {
    const toolCalls = response.choices[0].message.tool_calls
    allMessages.push(response.choices[0].message)

    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") continue
      const fn = toolCall.function
      const args = JSON.parse(fn.arguments)
      const result = await executeTool(fn.name, args, team.id)
      allMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      })
    }

    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: allMessages,
      tools: chatTools,
      stream: false,
    })

    iterations++
  }

  // If we have a final text response, stream it back
  const finalContent = response.choices[0]?.message.content
  if (finalContent) {
    return new Response(finalContent, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  // Fallback: stream a new completion
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: allMessages,
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content
        if (text) {
          controller.enqueue(encoder.encode(text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
