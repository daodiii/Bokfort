"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, X, Send, Loader2, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  role: "user" | "assistant"
  content: string
}

export function AiChatBubble() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: trimmed },
    ]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) throw new Error("Chat request failed")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No reader")

      const decoder = new TextDecoder()
      let assistantContent = ""

      setMessages([...newMessages, { role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        assistantContent += decoder.decode(value, { stream: true })
        setMessages([
          ...newMessages,
          { role: "assistant", content: assistantContent },
        ])
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Beklager, noe gikk galt. Prøv igjen.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Åpne AI-assistent"
      >
        <Sparkles className="size-6" />
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex w-96 flex-col rounded-xl border bg-background shadow-2xl"
      style={{ height: "500px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold">AI-assistent</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              Hei! Jeg er din regnskapsassistent.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Spør meg om inntekter, utgifter, fakturaer eller MVA.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            <div
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {msg.role === "user" ? (
                <User className="size-3" />
              ) : (
                <Bot className="size-3" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bot className="size-3" />
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Spør meg om regnskapet ditt..."
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            size="icon-sm"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
