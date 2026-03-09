"use client"

import { useState, useCallback, useRef } from "react"
import { scanReceiptAction, type ScanReceiptResult } from "@/actions/ai"
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type OcrData = NonNullable<ScanReceiptResult["data"]>

type ReceiptDropZoneProps = {
  onScanComplete: (data: OcrData) => void
}

export function ReceiptDropZone({ onScanComplete }: ReceiptDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setSuccess(false)
    setIsScanning(true)

    try {
      const formData = new FormData()
      formData.append("receipt", file)

      const result = await scanReceiptAction(formData)

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        if (result.data.confidence < 0.3) {
          setError("Kunne ikke lese kvitteringen. Prøv et tydeligere bilde.")
        } else {
          setSuccess(true)
          onScanComplete(result.data)
          setTimeout(() => setSuccess(false), 3000)
        }
      }
    } catch {
      setError("Noe gikk galt. Prøv igjen.")
    } finally {
      setIsScanning(false)
    }
  }, [onScanComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ""
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        isDragging && "border-primary bg-primary/5",
        isScanning && "pointer-events-none opacity-70",
        success && "border-emerald-500 bg-emerald-500/5",
        error && "border-destructive bg-destructive/5",
        !isDragging && !success && !error && "border-muted-foreground/25 hover:border-muted-foreground/50"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />

      {isScanning ? (
        <>
          <Loader2 className="size-8 animate-spin text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Leser kvittering...</p>
          <p className="text-xs text-muted-foreground">AI analyserer bildet</p>
        </>
      ) : success ? (
        <>
          <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
          <p className="text-sm font-medium text-emerald-600">Kvittering lest!</p>
          <p className="text-xs text-muted-foreground">Feltene er fylt ut automatisk</p>
        </>
      ) : error ? (
        <>
          <AlertCircle className="size-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">Klikk eller dra for å prøve igjen</p>
        </>
      ) : (
        <>
          <Upload className="size-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Dra kvittering hit eller klikk for å laste opp</p>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP eller PDF (maks 10 MB)</p>
        </>
      )}
    </div>
  )
}
