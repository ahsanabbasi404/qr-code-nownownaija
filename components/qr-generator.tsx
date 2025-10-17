"use client"

import type React from "react"

import { useState, useRef, RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import URLInput from "./url-input"
import QRPreview from "./qr-preview"
import DownloadButtons from "./download-buttons"
import { getSupabaseClient } from "@/lib/supabase-client"
import { generateSlug } from "@/lib/utils"

export default function QRGenerator() {
  const [url, setUrl] = useState("")
  const [qrValue, setQrValue] = useState("")
  const [outputUrl, setOutputUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const qrRef = useRef<HTMLDivElement>(null)

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }

  const handleGenerate = async () => {
    setError("")
    setOutputUrl("")

    if (!url.trim()) {
      setError("Please enter a URL")
      return
    }

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL (e.g., https://example.com)")
      return
    }

    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()
      const slug = generateSlug()
      const redirectUrl = `${process.env.NEXT_PUBLIC_URL}/r/${slug}`

      // Store QR code in Supabase
      const { error: dbError } = await supabase.from("qr_codes").insert({
        slug,
        target_url: url,
      })

      if (dbError) {
        setError("Failed to generate QR code. Please try again.")
        setIsLoading(false)
        return
      }

      // Generate QR code for redirect URL
      setQrValue(redirectUrl)
      setOutputUrl(redirectUrl)
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGenerate()
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="p-8 shadow-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">QR Code Generator</h1>
          <p className="text-muted-foreground text-sm">Convert any URL into a trackable QR code</p>
        </div>

        {/* Input Section */}
        <URLInput url={url} onUrlChange={setUrl} onKeyPress={handleKeyPress} error={error} />

        {/* Generate Button */}
        <Button onClick={handleGenerate} disabled={isLoading} className="w-full mb-6 h-10 font-medium">
          {isLoading ? "Generating..." : "Generate QR Code"}
        </Button>

        {/* Output URL Display */}
        {outputUrl && (
          <div className="mb-6 p-4 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2">Output URL:</p>
            <p className="text-sm font-mono text-foreground break-all">{outputUrl}</p>
          </div>
        )}

        {/* QR Preview Section */}
        {qrValue && <QRPreview qrRef={qrRef} qrValue={qrValue} />}

        {/* Download Buttons */}
        {qrValue && <DownloadButtons qrRef={qrRef as RefObject<HTMLDivElement>} url={url} />}

        {/* Info Text */}
        {!qrValue && (
          <div className="text-center text-xs text-muted-foreground mt-6">
            Enter a URL and click generate to create your trackable QR code
          </div>
        )}
      </Card>
    </div>
  )
}
